from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import pandas as pd

from preflight.core.base import BaseAuditor
from preflight.core.models import AuditResult, Finding


@dataclass(slots=True)
class ClassImbalanceAuditor(BaseAuditor):
    name: str = "class_imbalance"

    def run(self, df: pd.DataFrame, config: dict[str, Any]) -> AuditResult:
        target_column = config.get("target_column")
        if not target_column:
            raise ValueError("target_column is required")
        if target_column not in df.columns:
            raise ValueError(f"Target column not found: {target_column}")

        target = df[target_column].dropna()
        if target.empty:
            return AuditResult(
                auditor_name=self.name,
                score=100.0,
                findings=[],
                execution_time=0.0,
                status="COMPLETED",
            )

        target_type = str(config.get("target_type", "")).lower()
        if target_type == "regression" or self._is_regression_target(target):
            return self._run_regression(target, target_column)
        return self._run_classification(target, target_column)

    def _run_classification(self, target: pd.Series, target_column: str) -> AuditResult:
        counts = target.value_counts()
        majority = int(counts.iloc[0])
        minority = int(counts.iloc[-1])
        minority_label = counts.index[-1]
        imbalance_ratio = round(minority / majority if majority else 0.0, 4)

        if imbalance_ratio >= 0.5:
            return AuditResult(self.name, 100.0, [], 0.0, "COMPLETED")

        severity = self._severity_for_ratio(imbalance_ratio)
        findings = [
            Finding(
                issue_type="class_imbalance",
                severity=severity,
                affected_columns=[target_column],
                message=f"Class imbalance detected in {target_column}",
                metadata={
                    "target_type": "classification",
                    "imbalance_ratio": imbalance_ratio,
                    "majority_class": counts.index[0],
                    "minority_class": minority_label,
                    "majority_count": majority,
                    "minority_count": minority,
                },
            )
        ]
        penalty = min(50.0, round((1.0 - imbalance_ratio) * 50.0, 2))
        score = max(0.0, round(100.0 - penalty, 2))
        return AuditResult(self.name, score, findings, 0.0, "COMPLETED")

    def _run_regression(self, target: pd.Series, target_column: str) -> AuditResult:
        numeric_target = pd.to_numeric(target, errors="coerce").dropna()
        if numeric_target.empty:
            return AuditResult(self.name, 100.0, [], 0.0, "COMPLETED")

        skewness = float(numeric_target.skew()) if len(numeric_target.index) > 2 else 0.0
        abs_skewness = abs(skewness)
        if abs_skewness < 1.0:
            return AuditResult(self.name, 100.0, [], 0.0, "COMPLETED")

        severity = self._severity_for_skew(abs_skewness)
        findings = [
            Finding(
                issue_type="target_skewness",
                severity=severity,
                affected_columns=[target_column],
                message=f"Target distribution is skewed in {target_column}",
                metadata={
                    "target_type": "regression",
                    "skewness": round(skewness, 4),
                    "absolute_skewness": round(abs_skewness, 4),
                },
            )
        ]
        penalty = min(50.0, round(abs_skewness * 8.0, 2))
        score = max(0.0, round(100.0 - penalty, 2))
        return AuditResult(self.name, score, findings, 0.0, "COMPLETED")

    def _is_regression_target(self, target: pd.Series) -> bool:
        if pd.api.types.is_numeric_dtype(target):
            return target.nunique(dropna=True) > 10
        return False

    def _severity_for_ratio(self, ratio: float) -> str:
        if ratio < 0.05:
            return "critical"
        if ratio < 0.1:
            return "high"
        if ratio < 0.3:
            return "medium"
        return "low"

    def _severity_for_skew(self, skewness: float) -> str:
        if skewness >= 6:
            return "critical"
        if skewness >= 4:
            return "high"
        if skewness >= 2:
            return "medium"
        return "low"
