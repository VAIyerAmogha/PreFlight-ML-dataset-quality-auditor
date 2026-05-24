from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from preflight.core.models import AuditResult


AUDITOR_WEIGHTS: dict[str, float] = {
    "data_leakage": 0.25,
    "label_noise": 0.20,
    "bias": 0.15,
    "class_imbalance": 0.15,
    "duplicates": 0.10,
    "missing_data": 0.10,
    "outliers": 0.05,
}


@dataclass(slots=True)
class ScoreBreakdown:
    auditor_name: str
    weight: float
    score: float
    weighted_score: float
    penalty: float


@dataclass(slots=True)
class ScoreSummary:
    final_score: float
    interpretation_label: str
    breakdown: list[ScoreBreakdown]


class ScoringEngine:
    def __init__(self, weights: dict[str, float] | None = None) -> None:
        self.weights = dict(weights or AUDITOR_WEIGHTS)

    def score(self, results: list[AuditResult]) -> ScoreSummary:
        if not results:
            return ScoreSummary(final_score=100.0, interpretation_label="Excellent", breakdown=[])

        breakdown: list[ScoreBreakdown] = []
        weighted_total = 0.0
        critical_found = False

        for result in results:
            weight = self.weights.get(result.auditor_name, 0.0)
            weighted_score = round(result.score * weight, 4)
            penalty = round((100.0 - result.score) * weight, 4)
            weighted_total += weighted_score
            if any(finding.severity == "critical" for finding in result.findings):
                critical_found = True
            breakdown.append(
                ScoreBreakdown(
                    auditor_name=result.auditor_name,
                    weight=weight,
                    score=round(result.score, 4),
                    weighted_score=weighted_score,
                    penalty=penalty,
                )
            )

        final_score = round(weighted_total, 2)
        if critical_found:
            final_score = min(final_score, 69.0)

        return ScoreSummary(
            final_score=final_score,
            interpretation_label=self._interpret(final_score),
            breakdown=breakdown,
        )

    def _interpret(self, score: float) -> str:
        if score <= 40:
            return "Poor"
        if score <= 69:
            return "Fair"
        if score <= 84:
            return "Good"
        return "Excellent"