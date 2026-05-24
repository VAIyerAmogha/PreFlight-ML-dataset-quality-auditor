from __future__ import annotations

from dataclasses import dataclass

import pandas as pd

from preflight.core.base import BaseAuditor
from preflight.core.models import AuditResult, Finding
from preflight.execution.pipeline_runner import PipelineRunner
from preflight.storage.job_store import JobStore


@dataclass(slots=True)
class StableAuditor(BaseAuditor):
    name: str = "stable"

    def run(self, df: pd.DataFrame, config: dict) -> AuditResult:
        return AuditResult(
            auditor_name=self.name,
            score=88.0,
            findings=[
                Finding(
                    issue_type="test",
                    severity="low",
                    affected_columns=["value"],
                    message="ok",
                )
            ],
            execution_time=0.01,
            status="COMPLETED",
        )


@dataclass(slots=True)
class CrashingAuditor(BaseAuditor):
    name: str = "crash"

    def run(self, df: pd.DataFrame, config: dict) -> AuditResult:
        raise RuntimeError("boom")


def test_pipeline_runner_survives_auditor_failure(tmp_path) -> None:
    store = JobStore(tmp_path / "preflight.sqlite3")
    job = store.create_job("job-1", "sample.csv", str(tmp_path / "sample.csv"), auditor_total=2)
    runner = PipelineRunner(job_store=store, auditors=[StableAuditor(), CrashingAuditor()], max_workers=2)
    df = pd.DataFrame({"target": [0, 1, 0, 1], "protected": ["a", "a", "b", "b"]})

    report = runner.run(job.job_id, df, {"target_column": "target", "protected_attributes": ["protected"]})

    assert report.status == "COMPLETED"
    assert len(report.auditor_results) == 2
    assert any(result.status == "FAILED" for result in report.auditor_results)
    stored_report = store.fetch_report(job.job_id)
    assert stored_report.job_id == job.job_id
    assert stored_report.score_breakdown
