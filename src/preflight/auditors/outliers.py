from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np
import pandas as pd

from preflight.core.base import BaseAuditor
from preflight.core.models import AuditResult, Finding

try:  # pragma: no cover - optional dependency
    from sklearn.ensemble import IsolationForest
except Exception:  # pragma: no cover - optional dependency
    IsolationForest = None


@dataclass(slots=True)
class OutliersAuditor(BaseAuditor):
    name: str = "outliers"

    def run(self, df: pd.DataFrame, config: dict[str, Any]) -> AuditResult:
        numeric = df.select_dtypes(include=[np.number])
        if numeric.empty:
            return AuditResult(self.name, 100.0, [], 0.0, "COMPLETED")

        findings: list[Finding] = []
        penalty = 0.0

        for column in numeric.columns:
            series = numeric[column].dropna()
            if series.empty:
                continue
            outlier_mask = self._iqr_outliers(series)
            outlier_count = int(outlier_mask.sum())
            if outlier_count == 0:
                continue
            outlier_pct = round((outlier_count / len(series.index)) * 100, 2)
            severity = self._severity_for_pct(outlier_pct)
            findings.append(
                Finding(
                    issue_type="univariate_outliers",
                    severity=severity,
                    affected_columns=[column],
                    message=f"{outlier_count} outliers detected in {column}",
                    metadata={
                        "method": "iqr",
                        "outlier_count": outlier_count,
                        "outlier_pct": outlier_pct,
                    },
                )
            )
            penalty += min(30.0, outlier_pct)

        multivariate = self._multivariate_outliers(numeric)
        if multivariate:
            severity = self._severity_for_pct(round((len(multivariate) / len(numeric.index)) * 100, 2))
            findings.append(
                Finding(
                    issue_type="multivariate_outliers",
                    severity=severity,
                    affected_columns=list(numeric.columns),
                    message=f"{len(multivariate)} rows look multivariately anomalous",
                    metadata={"outlier_rows": multivariate},
                )
            )
            penalty += min(35.0, len(multivariate) * 5.0)

        score = max(0.0, round(100.0 - penalty, 2))
        return AuditResult(self.name, score, findings, 0.0, "COMPLETED")

    def _iqr_outliers(self, series: pd.Series) -> pd.Series:
        q1 = series.quantile(0.25)
        q3 = series.quantile(0.75)
        iqr = q3 - q1
        if iqr == 0:
            return pd.Series(False, index=series.index)
        lower = q1 - 1.5 * iqr
        upper = q3 + 1.5 * iqr
        return (series < lower) | (series > upper)

    def _multivariate_outliers(self, numeric: pd.DataFrame) -> list[int]:
        if len(numeric.columns) < 2 or len(numeric.index) < 4:
            return []

        if IsolationForest is not None and len(numeric.index) >= 20:
            model = IsolationForest(contamination=0.1, random_state=42)
            labels = model.fit_predict(numeric.fillna(numeric.median(numeric_only=True)))
            return [int(index) for index, label in enumerate(labels) if label == -1]

        centered = numeric.fillna(numeric.median(numeric_only=True))
        normalized = (centered - centered.mean()) / centered.std(ddof=0).replace(0, 1)
        distances = np.sqrt((normalized**2).sum(axis=1))
        threshold = float(distances.mean() + 2.5 * distances.std(ddof=0))
        return [int(index) for index, distance in enumerate(distances) if distance > threshold]

    def _severity_for_pct(self, pct: float) -> str:
        if pct >= 20:
            return "critical"
        if pct >= 10:
            return "high"
        if pct >= 3:
            return "medium"
        return "low"
