from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import pandas as pd

from preflight.core.base import BaseAuditor
from preflight.core.models import AuditResult, Finding


@dataclass(slots=True)
class DuplicatesAuditor(BaseAuditor):
    name: str = "duplicates"

    def run(self, df: pd.DataFrame, config: dict[str, Any]) -> AuditResult:
        total_rows = len(df.index)
        if total_rows == 0:
            return AuditResult(
                auditor_name=self.name,
                score=100.0,
                findings=[],
                execution_time=0.0,
                status="COMPLETED",
            )

        duplicate_mask = df.duplicated(keep=False)
        duplicate_rows = int(duplicate_mask.sum())
        if duplicate_rows == 0:
            return AuditResult(
                auditor_name=self.name,
                score=100.0,
                findings=[],
                execution_time=0.0,
                status="COMPLETED",
            )

        duplicate_rate = round((duplicate_rows / total_rows) * 100, 2)
        severity = self._severity_for_rate(duplicate_rate)
        findings = [
            Finding(
                issue_type="duplicate_rows",
                severity=severity,
                affected_columns=list(df.columns),
                message=f"{duplicate_rows} rows are exact duplicates",
                metadata={
                    "duplicate_rows": duplicate_rows,
                    "duplicate_rate": duplicate_rate,
                    "duplicate_groups": int(df.duplicated(keep='first').sum()),
                },
            )
        ]
        score = max(0.0, round(100.0 - duplicate_rate, 2))
        return AuditResult(
            auditor_name=self.name,
            score=score,
            findings=findings,
            execution_time=0.0,
            status="COMPLETED",
        )

    def _severity_for_rate(self, duplicate_rate: float) -> str:
        if duplicate_rate >= 30:
            return "critical"
        if duplicate_rate >= 15:
            return "high"
        if duplicate_rate >= 5:
            return "medium"
        return "low"
