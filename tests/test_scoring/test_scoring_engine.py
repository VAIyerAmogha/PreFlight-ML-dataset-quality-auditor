from __future__ import annotations

from preflight.core.models import AuditResult, Finding
from preflight.scoring.scoring_engine import AUDITOR_WEIGHTS, ScoringEngine


def _result(auditor_name: str, score: float, severity: str = "low") -> AuditResult:
    findings = []
    if severity:
        findings = [
            Finding(
                issue_type="test",
                severity=severity,
                affected_columns=["column"],
                message="message",
            )
        ]
    return AuditResult(
        auditor_name=auditor_name,
        score=score,
        findings=findings,
        execution_time=0.1,
        status="COMPLETED",
    )


def test_scoring_engine_weights_and_breakdown() -> None:
    results = [
        _result("data_leakage", 100),
        _result("label_noise", 100),
        _result("bias", 100),
        _result("class_imbalance", 100),
        _result("duplicates", 50),
        _result("missing_data", 50),
        _result("outliers", 100),
    ]

    summary = ScoringEngine().score(results)

    assert summary.final_score == 90.0
    assert len(summary.breakdown) == 7
    assert summary.breakdown[0].weight == AUDITOR_WEIGHTS["data_leakage"]
    assert summary.breakdown[4].weighted_score == 5.0


def test_scoring_engine_critical_cap_applies() -> None:
    results = [
        _result("data_leakage", 100, severity="critical"),
        _result("label_noise", 100),
        _result("bias", 100),
        _result("class_imbalance", 100),
        _result("duplicates", 100),
        _result("missing_data", 100),
        _result("outliers", 100),
    ]

    summary = ScoringEngine().score(results)

    assert summary.final_score == 69.0
    assert summary.interpretation_label == "Fair"


def test_scoring_engine_interpretation_labels() -> None:
    engine = ScoringEngine()

    excellent = engine.score([_result(name, 100) for name in AUDITOR_WEIGHTS])
    good = engine.score([_result(name, 80) for name in AUDITOR_WEIGHTS])
    fair = engine.score([_result(name, 60) for name in AUDITOR_WEIGHTS])
    poor = engine.score([_result(name, 35) for name in AUDITOR_WEIGHTS])

    assert excellent.interpretation_label == "Excellent"
    assert good.interpretation_label == "Good"
    assert fair.interpretation_label == "Fair"
    assert poor.interpretation_label == "Poor"
