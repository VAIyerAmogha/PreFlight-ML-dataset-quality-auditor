from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import pandas as pd

from preflight.core.base import BaseAuditor
from preflight.core.models import AuditResult, Finding


@dataclass(slots=True)
class MissingDataAuditor(BaseAuditor):
    name: str = "missing_data"

    def run(self, df: pd.DataFrame, config: dict[str, Any]) -> AuditResult:
        findings: list[Finding] = []
        penalties = 0.0
        total_cells = int(df.shape[0] * df.shape[1])

        if total_cells == 0:
            return AuditResult(
                auditor_name=self.name,
                score=100.0,
                findings=[],
                execution_time=0.0,
                status="COMPLETED",
            )

        for column in df.columns:
            series = df[column]
            missing_count = int(series.isna().sum())
            if missing_count == 0:
                continue

            missing_pct = round((missing_count / len(series.index)) * 100, 2)
            pattern = self._detect_pattern(series)
            severity = self._severity_for_missing_pct(missing_pct)
            findings.append(
                Finding(
                    issue_type="missing_data",
                    severity=severity,
                    affected_columns=[column],
                    message=f"{missing_count} missing values found in {column}",
                    metadata={
                        "missing_count": missing_count,
                        "missing_pct": missing_pct,
                        "pattern": pattern,
                        "heuristic": self._mcar_mar_heuristic(series, pattern),
                    },
                )
            )
            penalties += self._penalty_for_missing_pct(missing_pct)

        score = max(0.0, round(100.0 - penalties, 2))
        return AuditResult(
            auditor_name=self.name,
            score=score,
            findings=findings,
            execution_time=0.0,
            status="COMPLETED",
        )

    def _severity_for_missing_pct(self, missing_pct: float) -> str:
        if missing_pct >= 50:
            return "critical"
        if missing_pct >= 20:
            return "high"
        if missing_pct >= 5:
            return "medium"
        return "low"

    def _penalty_for_missing_pct(self, missing_pct: float) -> float:
        if missing_pct >= 50:
            return 25.0 + (missing_pct - 50) * 0.5
        if missing_pct >= 20:
            return 15.0 + (missing_pct - 20) * 0.4
        if missing_pct >= 5:
            return 5.0 + (missing_pct - 5) * 0.3
        return max(1.0, missing_pct * 0.4)

    def _detect_pattern(self, series: pd.Series) -> str:
        missing_mask = series.isna().tolist()
        if not any(missing_mask):
            return "none"

        if self._is_monotone_pattern(missing_mask):
            return "monotone"
        if self._is_block_pattern(missing_mask):
            return "block"
        return "random"

    def _is_monotone_pattern(self, missing_mask: list[bool]) -> bool:
        seen_missing = False
        for is_missing in missing_mask:
            if is_missing:
                seen_missing = True
            elif seen_missing:
                return False
        return True

    def _is_block_pattern(self, missing_mask: list[bool]) -> bool:
        if len(missing_mask) < 4:
            return False
        runs: list[tuple[bool, int]] = []
        current = missing_mask[0]
        count = 1
        for value in missing_mask[1:]:
            if value == current:
                count += 1
            else:
                runs.append((current, count))
                current = value
                count = 1
        runs.append((current, count))
        return any(is_missing and length >= max(3, len(missing_mask) // 4) for is_missing, length in runs)

    def _mcar_mar_heuristic(self, series: pd.Series, pattern: str) -> str:
        non_missing = series.dropna()
        if non_missing.empty:
            return "mcar"

        if pattern == "random":
            return "mcar"
        if pattern in {"block", "monotone"}:
            return "mar"
        return "mcar"
