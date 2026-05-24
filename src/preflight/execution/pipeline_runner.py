from __future__ import annotations

import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any

import pandas as pd

from preflight.auditors.bias import BiasAuditor
from preflight.auditors.class_imbalance import ClassImbalanceAuditor
from preflight.auditors.data_leakage import DataLeakageAuditor
from preflight.auditors.duplicates import DuplicatesAuditor
from preflight.auditors.label_noise import LabelNoiseAuditor
from preflight.auditors.missing_data import MissingDataAuditor
from preflight.auditors.outliers import OutliersAuditor
from preflight.core.base import BaseAuditor
from preflight.core.models import AuditResult, Finding
from preflight.reporting.schemas import AuditReportSchema, AuditorResultSchema, FindingSchema, ScoreBreakdownSchema
from preflight.scoring.scoring_engine import ScoringEngine
from preflight.storage.job_store import JobStore


@dataclass(slots=True)
class AuditorOutcome:
    auditor_name: str
    result: AuditResult
    error: str | None = None


@dataclass(slots=True)
class PipelineRunner:
    job_store: JobStore
    auditors: list[BaseAuditor] = field(
        default_factory=lambda: [
            MissingDataAuditor(),
            DuplicatesAuditor(),
            ClassImbalanceAuditor(),
            DataLeakageAuditor(),
            LabelNoiseAuditor(),
            OutliersAuditor(),
            BiasAuditor(),
        ]
    )
    scoring_engine: ScoringEngine = field(default_factory=ScoringEngine)
    max_workers: int = 7
    _executor: ThreadPoolExecutor = field(init=False, repr=False)

    def __post_init__(self) -> None:
        self._executor = ThreadPoolExecutor(max_workers=max(1, self.max_workers))

    def run(self, job_id: str, df: pd.DataFrame, config: dict[str, Any]) -> AuditReportSchema:
        job = self.job_store.get_job(job_id)
        outcomes = self._run_auditors(job_id, df, config)
        results = [outcome.result for outcome in outcomes]
        score_summary = self.scoring_engine.score(results)
        report = self._build_report(job_id, job.filename, job.created_at, job.started_at, results, outcomes, score_summary)
        self.job_store.save_completed_report(report)
        return report

    def shutdown(self) -> None:
        self._executor.shutdown(wait=False, cancel_futures=True)

    def _run_auditors(self, job_id: str, df: pd.DataFrame, config: dict[str, Any]) -> list[AuditorOutcome]:
        futures = {
            self._executor.submit(self._run_single_auditor, job_id, auditor, df, config): auditor.name
            for auditor in self.auditors
        }

        outcomes: list[AuditorOutcome] = []
        for future in as_completed(futures):
            auditor_name = futures[future]
            try:
                outcomes.append(future.result())
            except Exception as exc:  # noqa: BLE001
                failed_result = AuditResult(
                    auditor_name=auditor_name,
                    score=0.0,
                    findings=[],
                    execution_time=0.0,
                    status="FAILED",
                )
                self.job_store.record_auditor_result(
                    job_id,
                    auditor_name,
                    status="FAILED",
                    progress=100,
                    score=0.0,
                    execution_time=0.0,
                    findings=[],
                    error=f"{type(exc).__name__}: {exc}",
                )
                outcomes.append(AuditorOutcome(auditor_name=auditor_name, result=failed_result, error=f"{type(exc).__name__}: {exc}"))

        return outcomes

    def _run_single_auditor(
        self,
        job_id: str,
        auditor: BaseAuditor,
        df: pd.DataFrame,
        config: dict[str, Any],
    ) -> AuditorOutcome:
        self.job_store.record_auditor_running(job_id, auditor.name)
        started = time.perf_counter()
        try:
            result = auditor.run(df, config)
            result.execution_time = round(time.perf_counter() - started, 6)
            self.job_store.record_auditor_result(
                job_id,
                auditor.name,
                status=result.status,
                progress=100,
                score=result.score,
                execution_time=result.execution_time,
                findings=result.findings,
                error=None,
            )
            return AuditorOutcome(auditor_name=auditor.name, result=result)
        except Exception as exc:  # noqa: BLE001
            execution_time = round(time.perf_counter() - started, 6)
            failed_result = AuditResult(
                auditor_name=auditor.name,
                score=0.0,
                findings=[],
                execution_time=execution_time,
                status="FAILED",
            )
            self.job_store.record_auditor_result(
                job_id,
                auditor.name,
                status="FAILED",
                progress=100,
                score=0.0,
                execution_time=execution_time,
                findings=[],
                error=f"{type(exc).__name__}: {exc}",
            )
            return AuditorOutcome(auditor_name=auditor.name, result=failed_result, error=f"{type(exc).__name__}: {exc}")

    def _build_report(
        self,
        job_id: str,
        filename: str,
        created_at: str,
        started_at: str | None,
        results: list[AuditResult],
        outcomes: list[AuditorOutcome],
        score_summary: Any,
    ) -> AuditReportSchema:
        all_findings = [finding for result in results for finding in result.findings]
        error = next((outcome.error for outcome in outcomes if outcome.error is not None), None)
        auditor_results = [
            AuditorResultSchema(
                auditor_name=outcome.result.auditor_name,
                score=outcome.result.score,
                findings=[FindingSchema.model_validate(asdict(finding)) for finding in outcome.result.findings],
                execution_time=outcome.result.execution_time,
                status=outcome.result.status,
                progress=100,
                error=outcome.error,
            )
            for outcome in outcomes
        ]
        score_breakdown = [
            ScoreBreakdownSchema(
                auditor_name=item.auditor_name,
                weight=item.weight,
                score=item.score,
                weighted_score=item.weighted_score,
                penalty=item.penalty,
            )
            for item in score_summary.breakdown
        ]
        return AuditReportSchema(
            job_id=job_id,
            filename=filename,
            status="COMPLETED",
            progress=100,
            score=score_summary.final_score,
            interpretation_label=score_summary.interpretation_label,
            score_breakdown=score_breakdown,
            findings=[FindingSchema.model_validate(asdict(finding)) for finding in all_findings],
            auditor_results=auditor_results,
            created_at=created_at,
            started_at=started_at,
            completed_at=self.job_store._now(),
            error=error,
        )