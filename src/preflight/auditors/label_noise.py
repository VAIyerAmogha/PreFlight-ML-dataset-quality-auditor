from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import pandas as pd

from preflight.core.base import BaseAuditor
from preflight.core.models import AuditResult, Finding


@dataclass(slots=True)
class LabelNoiseAuditor(BaseAuditor):
    name: str = "label_noise"

    def run(self, df: pd.DataFrame, config: dict[str, Any]) -> AuditResult:
        target_column = config.get("target_column")
        if not target_column:
            raise ValueError("target_column is required")
        if target_column not in df.columns:
            raise ValueError(f"Target column not found: {target_column}")

        target = df[target_column]
        features = df.drop(columns=[target_column])
        if features.empty or target.dropna().empty:
            return AuditResult(self.name, 100.0, [], 0.0, "COMPLETED")

        suspicious_rows = self._identify_suspicious_rows(features, target)
        noise_rate = round((len(suspicious_rows) / len(df.index)) * 100, 2)
        if not suspicious_rows:
            return AuditResult(self.name, 100.0, [], 0.0, "COMPLETED")

        severity = self._severity_for_noise_rate(noise_rate)
        findings = [
            Finding(
                issue_type="potential_label_noise",
                severity=severity,
                affected_columns=[target_column],
                message=f"{len(suspicious_rows)} samples look mislabeled in {target_column}",
                metadata={
                    "noise_rate": noise_rate,
                    "suspected_rows": suspicious_rows,
                },
            )
        ]
        score = max(0.0, round(100.0 - min(60.0, noise_rate), 2))
        return AuditResult(self.name, score, findings, 0.0, "COMPLETED")

    def _identify_suspicious_rows(self, features: pd.DataFrame, target: pd.Series) -> list[int]:
        working = features.copy()
        if not self._has_numeric_signal(working):
            working = working.apply(lambda column: column.astype("category").cat.codes.astype(float))

        numeric_target = target.astype("category").cat.codes.astype(float)
        group_means = working.groupby(numeric_target).mean(numeric_only=True)
        if group_means.empty:
            return []

        suspicious_rows: list[int] = []
        for index, row in working.iterrows():
            distances = ((group_means - row) ** 2).sum(axis=1)
            predicted_label = distances.idxmin()
            actual_label = numeric_target.loc[index]
            if predicted_label != actual_label:
                suspicious_rows.append(int(index))
        return suspicious_rows

    def _has_numeric_signal(self, features: pd.DataFrame) -> bool:
        return any(pd.api.types.is_numeric_dtype(features[column]) for column in features.columns)

    def _severity_for_noise_rate(self, noise_rate: float) -> str:
        if noise_rate >= 35:
            return "critical"
        if noise_rate >= 20:
            return "high"
        if noise_rate >= 5:
            return "medium"
        return "low"
