from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import pandas as pd

from preflight.core.base import BaseAuditor
from preflight.core.models import AuditResult, Finding


@dataclass(slots=True)
class DataLeakageAuditor(BaseAuditor):
    name: str = "data_leakage"

    def run(self, df: pd.DataFrame, config: dict[str, Any]) -> AuditResult:
        target_column = config.get("target_column")
        if not target_column:
            raise ValueError("target_column is required")
        if target_column not in df.columns:
            raise ValueError(f"Target column not found: {target_column}")

        target = df[target_column]
        target_numeric = self._to_numeric_target(target)
        findings: list[Finding] = []
        penalties = 0.0

        for column in df.columns:
            if column == target_column:
                continue

            series = df[column]
            column_findings: list[Finding] = []

            if self._derived_column_name(column, target_column):
                column_findings.append(
                    Finding(
                        issue_type="derived_feature_leakage",
                        severity="high",
                        affected_columns=[column],
                        message=f"{column} looks derived from {target_column}",
                        metadata={"heuristic": "name_similarity"},
                    )
                )
                penalties += 20.0

            if self._temporal_leakage_name(column):
                column_findings.append(
                    Finding(
                        issue_type="temporal_leakage",
                        severity="medium",
                        affected_columns=[column],
                        message=f"{column} suggests future information leakage",
                        metadata={"heuristic": "temporal_name"},
                    )
                )
                penalties += 10.0

            correlation_info = self._correlation_with_target(series, target_numeric)
            if correlation_info is not None:
                method, correlation = correlation_info
                if abs(correlation) >= 0.95:
                    column_findings.append(
                        Finding(
                            issue_type="near_perfect_predictor",
                            severity="critical",
                            affected_columns=[column],
                            message=f"{column} is nearly a direct proxy for {target_column}",
                            metadata={"method": method, "correlation": round(correlation, 4)},
                        )
                    )
                    penalties += 35.0
                elif abs(correlation) >= 0.7:
                    column_findings.append(
                        Finding(
                            issue_type="predictive_leakage",
                            severity="medium",
                            affected_columns=[column],
                            message=f"{column} is strongly correlated with {target_column}",
                            metadata={"method": method, "correlation": round(correlation, 4)},
                        )
                    )
                    penalties += 12.0

            findings.extend(column_findings)

        score = max(0.0, round(100.0 - penalties, 2))
        return AuditResult(
            auditor_name=self.name,
            score=score,
            findings=findings,
            execution_time=0.0,
            status="COMPLETED",
        )

    def _to_numeric_target(self, target: pd.Series) -> pd.Series | None:
        if pd.api.types.is_numeric_dtype(target):
            return pd.to_numeric(target, errors="coerce")
        unique_values = target.dropna().unique()
        if len(unique_values) == 2:
            mapping = {value: index for index, value in enumerate(sorted(unique_values))}
            return target.map(mapping).astype(float)
        return None

    def _correlation_with_target(
        self,
        series: pd.Series,
        target_numeric: pd.Series | None,
    ) -> tuple[str, float] | None:
        if target_numeric is None:
            return None

        if pd.api.types.is_numeric_dtype(series):
            aligned = pd.concat([series, target_numeric], axis=1).dropna()
            if len(aligned.index) < 3:
                return None
            pearson = float(aligned.iloc[:, 0].corr(aligned.iloc[:, 1], method="pearson"))
            spearman = self._spearman_corr(aligned.iloc[:, 0], aligned.iloc[:, 1])
            if pd.isna(pearson) and pd.isna(spearman):
                return None
            if pd.isna(pearson):
                return "spearman", spearman
            if pd.isna(spearman):
                return "pearson", pearson
            if abs(spearman) > abs(pearson):
                return "spearman", spearman
            return "pearson", pearson

        if series.nunique(dropna=True) == 2:
            encoded = series.astype("category").cat.codes.astype(float)
            aligned = pd.concat([encoded, target_numeric], axis=1).dropna()
            if len(aligned.index) < 3:
                return None
            correlation = float(aligned.iloc[:, 0].corr(aligned.iloc[:, 1], method="pearson"))
            return "point_biserial", correlation

        return None

    def _derived_column_name(self, column: str, target_column: str) -> bool:
        normalized_column = column.lower().replace("_", "")
        normalized_target = target_column.lower().replace("_", "")
        if normalized_target and normalized_target in normalized_column and normalized_column != normalized_target:
            return True
        derived_tokens = ["target", "label", "leak", "derived", "proxy", "score", "outcome"]
        return any(token in column.lower() for token in derived_tokens)

    def _temporal_leakage_name(self, column: str) -> bool:
        lowered = column.lower()
        return any(token in lowered for token in ["future", "next", "after", "lead", "post_event"])

    def _spearman_corr(self, left: pd.Series, right: pd.Series) -> float:
        left_rank = left.rank(method="average")
        right_rank = right.rank(method="average")
        return float(left_rank.corr(right_rank, method="pearson"))
