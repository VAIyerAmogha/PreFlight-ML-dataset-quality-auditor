from __future__ import annotations

from preflight.suggestions.findings_serializer import FindingsSerializer
from preflight.reporting.schemas import AuditReportSchema, AuditorResultSchema, FindingSchema


def test_findings_serializer_produces_non_empty_payload() -> None:
    report = AuditReportSchema(
        job_id="job-1",
        filename="data.csv",
        status="COMPLETED",
        progress=100,
        score=77.0,
        interpretation_label="Good",
        findings=[
            FindingSchema(
                issue_type="missing_data",
                severity="medium",
                affected_columns=["age"],
                message="missing values",
                metadata={"missing_pct": 12.5},
            )
        ],
        auditor_results=[
            AuditorResultSchema(
                auditor_name="missing_data",
                score=88.0,
                findings=[
                    FindingSchema(
                        issue_type="missing_data",
                        severity="medium",
                        affected_columns=["age"],
                        message="missing values",
                        metadata={"missing_pct": 12.5},
                    )
                ],
                execution_time=0.1,
                status="COMPLETED",
                progress=100,
            ),
            AuditorResultSchema(
                auditor_name="duplicates",
                score=100.0,
                findings=[],
                execution_time=0.1,
                status="COMPLETED",
                progress=100,
            ),
        ],
        created_at="2026-05-24T00:00:00Z",
    )

    payload = FindingsSerializer().serialize(report)

    assert payload["job_id"] == "job-1"
    assert payload["summary"]["auditor_count"] == 1
    assert len(payload["findings"]) == 1
