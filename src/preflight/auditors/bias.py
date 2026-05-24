from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import pandas as pd

from preflight.core.base import BaseAuditor
from preflight.core.models import AuditResult, Finding


@dataclass(slots=True)
class BiasAuditor(BaseAuditor):
    name: str = "bias"

    def run(self, df: pd.DataFrame, config: dict[str, Any]) -> AuditResult:
        target_column = config.get("target_column")
        protected_attributes = config.get("protected_attributes") or []

        if not target_column:
            raise ValueError("target_column is required")
        if target_column not in df.columns:
            raise ValueError(f"Target column not found: {target_column}")
        if not protected_attributes:
            raise ValueError("protected_attributes is required")

        target = self._binary_target(df[target_column])
        findings: list[Finding] = []
        penalties = 0.0

        for attribute in protected_attributes:
            if attribute not in df.columns:
                raise ValueError(f"Protected attribute not found: {attribute}")

            subgroup_finding, penalty = self._subgroup_balance_finding(df, attribute)
            if subgroup_finding is not None:
                findings.append(subgroup_finding)
                penalties += penalty

            parity_finding, penalty = self._demographic_parity_finding(df, attribute, target)
            if parity_finding is not None:
                findings.append(parity_finding)
                penalties += penalty

        score = max(0.0, round(100.0 - penalties, 2))
        return AuditResult(self.name, score, findings, 0.0, "COMPLETED")

    def _binary_target(self, target: pd.Series) -> pd.Series:
        if pd.api.types.is_numeric_dtype(target):
            unique_values = sorted(target.dropna().unique())
            if len(unique_values) == 2:
                mapping = {unique_values[0]: 0.0, unique_values[1]: 1.0}
                return target.map(mapping).astype(float)
            threshold = float(target.median())
            return (target > threshold).astype(float)
        return target.astype("category").cat.codes.astype(float)

    def _subgroup_balance_finding(self, df: pd.DataFrame, attribute: str) -> tuple[Finding | None, float]:
        counts = df[attribute].value_counts(dropna=False)
        if len(counts.index) < 2:
            return None, 0.0

        largest = int(counts.iloc[0])
        smallest = int(counts.iloc[-1])
        imbalance_ratio = round(smallest / largest if largest else 0.0, 4)
        if imbalance_ratio >= 0.8:
            return None, 0.0

        severity = self._severity_for_ratio(imbalance_ratio)
        return (
            Finding(
                issue_type="subgroup_imbalance",
                severity=severity,
                affected_columns=[attribute],
                message=f"Subgroup imbalance detected in {attribute}",
                metadata={
                    "imbalance_ratio": imbalance_ratio,
                    "largest_group": counts.index[0],
                    "smallest_group": counts.index[-1],
                    "largest_count": largest,
                    "smallest_count": smallest,
                },
            ),
            min(30.0, round((1.0 - imbalance_ratio) * 25.0, 2)),
        )

    def _demographic_parity_finding(
        self,
        df: pd.DataFrame,
        attribute: str,
        target: pd.Series,
    ) -> tuple[Finding | None, float]:
        working = pd.DataFrame({"attribute": df[attribute], "target": target}).dropna()
        if working.empty:
            return None, 0.0

        positive_rates: dict[str, float] = {}
        for value, group in working.groupby("attribute"):
            if len(group.index) == 0:
                continue
            positive_rates[str(value)] = float(group["target"].mean())

        if len(positive_rates) < 2:
            return None, 0.0

        max_rate = max(positive_rates.values())
        min_rate = min(positive_rates.values())
        difference = round(max_rate - min_rate, 4)
        if difference < 0.1:
            return None, 0.0

        severity = self._severity_for_difference(difference)
        return (
            Finding(
                issue_type="demographic_parity_difference",
                severity=severity,
                affected_columns=[attribute],
                message=f"Demographic parity difference detected for {attribute}",
                metadata={"difference": difference, "positive_rates": positive_rates},
            ),
            min(40.0, round(difference * 50.0, 2)),
        )

    def _severity_for_ratio(self, ratio: float) -> str:
        if ratio < 0.25:
            return "critical"
        if ratio < 0.5:
            return "high"
        if ratio < 0.8:
            return "medium"
        return "low"

    def _severity_for_difference(self, difference: float) -> str:
        if difference >= 0.5:
            return "critical"
        if difference >= 0.35:
            return "high"
        if difference >= 0.2:
            return "medium"
        return "low"
