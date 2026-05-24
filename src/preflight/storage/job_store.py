from __future__ import annotations

import json
from dataclasses import asdict, dataclass, is_dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from preflight.core.models import AuditResult, Finding
from preflight.reporting.schemas import (
    AuditReportSchema,
    AuditorResultSchema,
    FindingSchema,
    ScoreBreakdownSchema,
    JobStatusSchema,
)
from preflight.storage.database import connect, initialize_database
from preflight.scoring.scoring_engine import ScoringEngine


class JobNotFoundError(KeyError):
    pass


@dataclass(slots=True)
class JobRecord:
    job_id: str
    filename: str
    stored_path: str
    status: str
    progress: int
    score: float | None
    created_at: str
    started_at: str | None
    completed_at: str | None
    error: str | None
    report_json: str | None
    report_ready: bool
    auditor_total: int
    auditor_completed: int


@dataclass(slots=True)
class AuditorRecord:
    auditor_name: str
    status: str
    progress: int
    score: float | None
    execution_time: float | None
    findings_json: str
    error: str | None
    created_at: str
    updated_at: str


class JobStore:
    def __init__(self, db_path: str | Path) -> None:
        self.db_path = Path(db_path)
        initialize_database(self.db_path)

    def create_job(self, job_id: str, filename: str, stored_path: str, auditor_total: int) -> JobRecord:
        created_at = self._now()
        with connect(self.db_path) as connection:
            connection.execute(
                """
                INSERT INTO jobs (
                    job_id, filename, stored_path, status, progress, score,
                    created_at, started_at, completed_at, error, report_json,
                    report_ready, auditor_total, auditor_completed
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    job_id,
                    filename,
                    stored_path,
                    "PENDING",
                    0,
                    None,
                    created_at,
                    None,
                    None,
                    None,
                    None,
                    0,
                    auditor_total,
                    0,
                ),
            )
            connection.commit()
        return self.get_job(job_id)

    def get_job(self, job_id: str) -> JobRecord:
        with connect(self.db_path) as connection:
            row = connection.execute(
                "SELECT * FROM jobs WHERE job_id = ?",
                (job_id,),
            ).fetchone()
        if row is None:
            raise JobNotFoundError(job_id)
        return self._row_to_job(row)

    def get_job_status(self, job_id: str) -> JobStatusSchema:
        job = self.get_job(job_id)
        return JobStatusSchema(
            job_id=job.job_id,
            filename=job.filename,
            status=job.status,
            progress=job.progress,
            created_at=job.created_at,
            started_at=job.started_at,
            completed_at=job.completed_at,
            error=job.error,
            report_ready=job.report_ready,
        )

    def mark_job_running(self, job_id: str) -> None:
        self.update_job(
            job_id,
            status="RUNNING",
            progress=1,
            started_at=self._now(),
        )

    def mark_job_failed(self, job_id: str, error: str) -> None:
        self.update_job(
            job_id,
            status="FAILED",
            error=error,
            completed_at=self._now(),
            report_ready=0,
            progress=100,
        )

    def mark_job_completed(self, job_id: str, score: float, report: AuditReportSchema) -> None:
        self.update_job(
            job_id,
            status="COMPLETED",
            progress=100,
            score=score,
            completed_at=self._now(),
            report_json=report.model_dump_json(),
            report_ready=1,
            error=None,
        )

    def record_auditor_running(self, job_id: str, auditor_name: str) -> None:
        self.upsert_auditor_result(
            job_id=job_id,
            auditor_name=auditor_name,
            status="RUNNING",
            progress=0,
            score=None,
            execution_time=None,
            findings=[],
            error=None,
        )

    def record_auditor_result(
        self,
        job_id: str,
        auditor_name: str,
        *,
        status: str,
        progress: int,
        score: float | None,
        execution_time: float | None,
        findings: list[Any],
        error: str | None = None,
    ) -> None:
        self.upsert_auditor_result(
            job_id=job_id,
            auditor_name=auditor_name,
            status=status,
            progress=progress,
            score=score,
            execution_time=execution_time,
            findings=findings,
            error=error,
        )

    def fetch_report(self, job_id: str) -> AuditReportSchema:
        job = self.get_job(job_id)
        if not job.report_ready or not job.report_json:
            raise ValueError("Report is not ready yet")
        return AuditReportSchema.model_validate_json(job.report_json)

    def build_report(self, job_id: str) -> AuditReportSchema:
        job = self.get_job(job_id)
        auditors = self.list_auditor_records(job_id)
        results: list[AuditResult] = []
        outcomes: list[AuditorResultSchema] = []

        for auditor in auditors:
            auditor_findings = [FindingSchema.model_validate(item) for item in json.loads(auditor.findings_json)]
            results.append(
                AuditResult(
                    auditor_name=auditor.auditor_name,
                    score=auditor.score if auditor.score is not None else 0.0,
                    findings=[
                        Finding(
                            issue_type=finding.issue_type,
                            severity=finding.severity,
                            affected_columns=list(finding.affected_columns),
                            message=finding.message,
                            metadata=dict(finding.metadata),
                        )
                        for finding in auditor_findings
                    ],
                    execution_time=auditor.execution_time if auditor.execution_time is not None else 0.0,
                    status=auditor.status,
                )
            )
            outcomes.append(
                AuditorResultSchema(
                    auditor_name=auditor.auditor_name,
                    score=auditor.score if auditor.score is not None else 0.0,
                    findings=auditor_findings,
                    execution_time=auditor.execution_time if auditor.execution_time is not None else 0.0,
                    status=auditor.status,
                    progress=auditor.progress,
                    error=auditor.error,
                )
            )

        score_summary = ScoringEngine().score(results)
        return AuditReportSchema(
            job_id=job.job_id,
            filename=job.filename,
            status=job.status,
            progress=job.progress,
            score=score_summary.final_score,
            interpretation_label=score_summary.interpretation_label,
            score_breakdown=[
                ScoreBreakdownSchema(
                    auditor_name=item.auditor_name,
                    weight=item.weight,
                    score=item.score,
                    weighted_score=item.weighted_score,
                    penalty=item.penalty,
                )
                for item in score_summary.breakdown
            ],
            findings=[finding for result in results for finding in result.findings],
            auditor_results=outcomes,
            created_at=job.created_at,
            started_at=job.started_at,
            completed_at=job.completed_at,
            error=job.error,
        )

    def save_completed_report(self, report: AuditReportSchema) -> None:
        completed_at = report.completed_at or self._now()
        self.update_job(
            report.job_id,
            status=report.status,
            progress=report.progress,
            score=report.score,
            completed_at=completed_at,
            report_json=report.model_dump_json(),
            report_ready=1,
            error=report.error,
            auditor_completed=len(report.auditor_results),
        )

    def complete_job(self, job_id: str) -> AuditReportSchema:
        report = self.build_report(job_id)
        report.status = "COMPLETED"
        report.progress = 100
        report.completed_at = self._now()
        self.save_completed_report(report)
        return report

    def update_job(
        self,
        job_id: str,
        *,
        status: str | None = None,
        progress: int | None = None,
        score: float | None = None,
        started_at: str | None = None,
        completed_at: str | None = None,
        error: str | None = None,
        report_json: str | None = None,
        report_ready: int | None = None,
        auditor_total: int | None = None,
        auditor_completed: int | None = None,
    ) -> None:
        assignments: list[str] = []
        values: list[Any] = []

        for column, value in (
            ("status", status),
            ("progress", progress),
            ("score", score),
            ("started_at", started_at),
            ("completed_at", completed_at),
            ("error", error),
            ("report_json", report_json),
            ("report_ready", report_ready),
            ("auditor_total", auditor_total),
            ("auditor_completed", auditor_completed),
        ):
            if value is not None:
                assignments.append(f"{column} = ?")
                values.append(value)

        if not assignments:
            return

        values.append(job_id)
        with connect(self.db_path) as connection:
            result = connection.execute(
                f"UPDATE jobs SET {', '.join(assignments)} WHERE job_id = ?",
                values,
            )
            if result.rowcount == 0:
                raise JobNotFoundError(job_id)
            connection.commit()

    def upsert_auditor_result(
        self,
        *,
        job_id: str,
        auditor_name: str,
        status: str,
        progress: int,
        score: float | None,
        execution_time: float | None,
        findings: list[Any],
        error: str | None,
    ) -> None:
        payload = json.dumps([self._normalize_finding(item) for item in findings])
        now = self._now()
        with connect(self.db_path) as connection:
            connection.execute(
                """
                INSERT INTO audit_results (
                    job_id, auditor_name, status, progress, score,
                    execution_time, findings_json, error, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(job_id, auditor_name) DO UPDATE SET
                    status = excluded.status,
                    progress = excluded.progress,
                    score = excluded.score,
                    execution_time = excluded.execution_time,
                    findings_json = excluded.findings_json,
                    error = excluded.error,
                    updated_at = excluded.updated_at
                """,
                (
                    job_id,
                    auditor_name,
                    status,
                    progress,
                    score,
                    execution_time,
                    payload,
                    error,
                    now,
                    now,
                ),
            )
            connection.commit()
        self._refresh_job_auditor_progress(job_id)

    def list_auditor_records(self, job_id: str) -> list[AuditorRecord]:
        with connect(self.db_path) as connection:
            rows = connection.execute(
                "SELECT * FROM audit_results WHERE job_id = ? ORDER BY id ASC",
                (job_id,),
            ).fetchall()
        return [self._row_to_auditor(row) for row in rows]

    def _refresh_job_auditor_progress(self, job_id: str) -> None:
        auditors = self.list_auditor_records(job_id)
        job = self.get_job(job_id)
        if job.auditor_total <= 0:
            return
        completed = sum(1 for auditor in auditors if auditor.status in {"COMPLETED", "FAILED"})
        progress = int((completed / job.auditor_total) * 100)
        self.update_job(job_id, auditor_completed=completed, progress=max(job.progress, progress))

    def _row_to_job(self, row: Any) -> JobRecord:
        return JobRecord(
            job_id=row["job_id"],
            filename=row["filename"],
            stored_path=row["stored_path"],
            status=row["status"],
            progress=int(row["progress"]),
            score=row["score"],
            created_at=row["created_at"],
            started_at=row["started_at"],
            completed_at=row["completed_at"],
            error=row["error"],
            report_json=row["report_json"],
            report_ready=bool(row["report_ready"]),
            auditor_total=int(row["auditor_total"]),
            auditor_completed=int(row["auditor_completed"]),
        )

    def _row_to_auditor(self, row: Any) -> AuditorRecord:
        return AuditorRecord(
            auditor_name=row["auditor_name"],
            status=row["status"],
            progress=int(row["progress"]),
            score=row["score"],
            execution_time=row["execution_time"],
            findings_json=row["findings_json"],
            error=row["error"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )

    def _normalize_finding(self, item: Any) -> dict[str, Any]:
        if hasattr(item, "model_dump"):
            return item.model_dump()
        if is_dataclass(item):
            return asdict(item)
        if hasattr(item, "__dict__"):
            return dict(item.__dict__)
        return dict(item)

    def _now(self) -> str:
        return datetime.now(timezone.utc).isoformat()
