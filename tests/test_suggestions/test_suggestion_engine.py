from __future__ import annotations

from preflight.reporting.schemas import AuditReportSchema, AuditorResultSchema, FindingSchema
from preflight.suggestions.ollama_client import OllamaClient
from preflight.suggestions.suggestion_engine import SuggestionEngine


def _report() -> AuditReportSchema:
    return AuditReportSchema(
        job_id="job-1",
        filename="data.csv",
        status="COMPLETED",
        progress=100,
        score=55.0,
        interpretation_label="Fair",
        findings=[
            FindingSchema(issue_type="missing_data", severity="medium", affected_columns=["age"], message="missing", metadata={}),
            FindingSchema(issue_type="duplicate_rows", severity="low", affected_columns=["*"], message="dupes", metadata={}),
        ],
        auditor_results=[
            AuditorResultSchema(auditor_name="missing_data", score=88.0, findings=[FindingSchema(issue_type="missing_data", severity="medium", affected_columns=["age"], message="missing", metadata={})], execution_time=0.1, status="COMPLETED", progress=100),
            AuditorResultSchema(auditor_name="duplicates", score=92.0, findings=[FindingSchema(issue_type="duplicate_rows", severity="low", affected_columns=["*"], message="dupes", metadata={})], execution_time=0.1, status="COMPLETED", progress=100),
        ],
        created_at="2026-05-24T00:00:00Z",
    )


def test_suggestion_engine_uses_fallback_when_ollama_unreachable() -> None:
    engine = SuggestionEngine(ollama_client=OllamaClient(timeout_seconds=0.01))
    suggestions = engine.generate(_report())

    assert suggestions
    assert any("Impute" in suggestion.title for suggestion in suggestions)
    assert all(suggestion.code.strip() for suggestion in suggestions)
