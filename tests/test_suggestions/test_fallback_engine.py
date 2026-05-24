from __future__ import annotations

from preflight.reporting.schemas import AuditReportSchema, AuditorResultSchema, FindingSchema
from preflight.suggestions.fallback_engine import RuleBasedFallbackEngine


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
            FindingSchema(issue_type="class_imbalance", severity="high", affected_columns=["label"], message="imbalance", metadata={}),
            FindingSchema(issue_type="derived_feature_leakage", severity="high", affected_columns=["target_ratio"], message="leak", metadata={}),
            FindingSchema(issue_type="univariate_outliers", severity="medium", affected_columns=["income"], message="outlier", metadata={}),
            FindingSchema(issue_type="potential_label_noise", severity="medium", affected_columns=["label"], message="noise", metadata={}),
            FindingSchema(issue_type="demographic_parity_difference", severity="critical", affected_columns=["protected"], message="bias", metadata={}),
        ],
        auditor_results=[
            AuditorResultSchema(auditor_name="missing_data", score=88.0, findings=[FindingSchema(issue_type="missing_data", severity="medium", affected_columns=["age"], message="missing", metadata={})], execution_time=0.1, status="COMPLETED", progress=100),
            AuditorResultSchema(auditor_name="duplicates", score=92.0, findings=[FindingSchema(issue_type="duplicate_rows", severity="low", affected_columns=["*"], message="dupes", metadata={})], execution_time=0.1, status="COMPLETED", progress=100),
            AuditorResultSchema(auditor_name="class_imbalance", score=70.0, findings=[FindingSchema(issue_type="class_imbalance", severity="high", affected_columns=["label"], message="imbalance", metadata={})], execution_time=0.1, status="COMPLETED", progress=100),
            AuditorResultSchema(auditor_name="data_leakage", score=65.0, findings=[FindingSchema(issue_type="derived_feature_leakage", severity="high", affected_columns=["target_ratio"], message="leak", metadata={})], execution_time=0.1, status="COMPLETED", progress=100),
            AuditorResultSchema(auditor_name="label_noise", score=60.0, findings=[FindingSchema(issue_type="potential_label_noise", severity="medium", affected_columns=["label"], message="noise", metadata={})], execution_time=0.1, status="COMPLETED", progress=100),
            AuditorResultSchema(auditor_name="outliers", score=75.0, findings=[FindingSchema(issue_type="univariate_outliers", severity="medium", affected_columns=["income"], message="outlier", metadata={})], execution_time=0.1, status="COMPLETED", progress=100),
            AuditorResultSchema(auditor_name="bias", score=50.0, findings=[FindingSchema(issue_type="demographic_parity_difference", severity="critical", affected_columns=["protected"], message="bias", metadata={})], execution_time=0.1, status="COMPLETED", progress=100),
        ],
        created_at="2026-05-24T00:00:00Z",
    )


def test_fallback_engine_covers_all_major_finding_types() -> None:
    suggestions = RuleBasedFallbackEngine().generate(_report())

    titles = {suggestion.title for suggestion in suggestions}
    assert any("Impute missing values" in title for title in titles)
    assert any("Remove duplicate rows" in title for title in titles)
    assert any("Balance the target distribution" in title for title in titles)
    assert any("Drop leakage-prone columns" in title for title in titles)
    assert any("Clip numeric outliers" in title for title in titles)
    assert any("Filter suspicious labels" in title for title in titles)
    assert any("Inspect protected subgroup balance" in title for title in titles)

    for suggestion in suggestions:
        assert suggestion.code.strip()
