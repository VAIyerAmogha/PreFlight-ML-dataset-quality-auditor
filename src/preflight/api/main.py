from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any
from uuid import uuid4

from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.concurrency import run_in_threadpool

from preflight.execution.job_runner import JobRunner
from preflight.ingestion.dataset_ingester import DatasetIngestError, DatasetIngester
from preflight.reporting.schemas import AuditReportSchema, JobStatusSchema, UploadResponseSchema
from preflight.suggestions.schemas import Suggestion
from preflight.suggestions.suggestion_engine import SuggestionEngine
from preflight.storage.job_store import JobNotFoundError, JobStore

logger = logging.getLogger(__name__)

DEFAULT_DB_PATH = Path("data/preflight.sqlite3")
DEFAULT_UPLOAD_DIR = Path("uploads")


def create_app(
    *,
    db_path: str | Path = DEFAULT_DB_PATH,
    upload_dir: str | Path = DEFAULT_UPLOAD_DIR,
    max_workers: int = 2,
) -> FastAPI:
    store = JobStore(db_path)
    runner = JobRunner(job_store=store, max_workers=max_workers)
    suggestion_engine = SuggestionEngine()
    upload_path = Path(upload_dir)
    upload_path.mkdir(parents=True, exist_ok=True)

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        yield
        runner.shutdown()

    app = FastAPI(title="PreFlight", version="0.2.0", lifespan=lifespan)
    app.state.job_store = store
    app.state.job_runner = runner
    app.state.suggestion_engine = suggestion_engine
    app.state.upload_dir = upload_path
    app.state.ingester = DatasetIngester()

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def error_handling_middleware(request: Request, call_next: Any) -> JSONResponse:
        try:
            return await call_next(request)
        except HTTPException:
            raise
        except Exception as exc:  # noqa: BLE001
            logger.exception("Unhandled error while processing %s", request.url.path)
            return JSONResponse(
                status_code=500,
                content={"detail": "Internal Server Error", "error": type(exc).__name__},
            )

    @app.exception_handler(JobNotFoundError)
    async def handle_job_not_found(_: Request, exc: JobNotFoundError) -> JSONResponse:
        return JSONResponse(status_code=404, content={"detail": f"Job not found: {exc.args[0]}"})

    @app.exception_handler(DatasetIngestError)
    async def handle_ingest_error(_: Request, exc: DatasetIngestError) -> JSONResponse:
        return JSONResponse(status_code=400, content={"detail": str(exc)})

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.post("/upload", response_model=UploadResponseSchema)
    async def upload_csv(file: UploadFile = File(...)) -> UploadResponseSchema:
        if not file.filename:
            raise HTTPException(status_code=400, detail="A CSV file is required")
        if Path(file.filename).suffix.lower() != ".csv":
            raise HTTPException(status_code=400, detail="Only CSV files are supported")

        job_id = uuid4().hex
        stored_path = upload_path / f"{job_id}.csv"
        await _save_upload(file, stored_path)
        store.create_job(job_id, file.filename, str(stored_path), auditor_total=len(runner.auditors))

        try:
            await run_in_threadpool(app.state.ingester.ingest, stored_path)
        except DatasetIngestError as exc:
            store.mark_job_failed(job_id, str(exc))
            raise HTTPException(status_code=400, detail={"job_id": job_id, "error": str(exc)}) from exc

        runner.submit_job(job_id, stored_path)
        return UploadResponseSchema(
            job_id=job_id,
            status="PENDING",
            message="Job queued for local execution",
        )

    @app.get("/jobs/{job_id}", response_model=JobStatusSchema)
    def get_job(job_id: str) -> JobStatusSchema:
        return store.get_job_status(job_id)

    @app.get("/jobs/{job_id}/report", response_model=AuditReportSchema)
    def get_report(job_id: str) -> AuditReportSchema:
        report = store.fetch_report(job_id)
        if report.status != "COMPLETED":
            raise HTTPException(status_code=202, detail="Report is not ready yet")
        return report

    @app.get("/jobs/{job_id}/suggestions", response_model=list[Suggestion])
    async def get_suggestions(job_id: str) -> list[Suggestion]:
        try:
            report = store.fetch_report(job_id)
        except ValueError as exc:
            raise HTTPException(status_code=202, detail="Report is not ready yet") from exc
        if report.status != "COMPLETED":
            raise HTTPException(status_code=202, detail="Report is not ready yet")
        return await run_in_threadpool(app.state.suggestion_engine.generate, report)

    return app


async def _save_upload(file: UploadFile, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(await file.read())
    await file.close()


app = create_app()
