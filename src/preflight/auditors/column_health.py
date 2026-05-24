from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import pandas as pd

from preflight.core.base import BaseAuditor
from preflight.core.models import AuditResult, Finding
from preflight.profiling.column_profiler import ColumnProfiler


@dataclass(slots=True)
class ColumnHealthAuditor(BaseAuditor):
    name: str = "column_health"

    def run(self, df: pd.DataFrame, config: dict[str, Any]) -> AuditResult:
        profiler = ColumnProfiler()
        profiles = profiler.profile_dataframe(df)
        findings: list[Finding] = []
        penalties = 0.0

        for column, profile in profiles.items():
            if profile.null_count > 0:
                severity = "medium" if profile.null_pct >= 20 else "low"
                findings.append(
                    Finding(
                        issue_type="missing_values",
                        severity=severity,
                        affected_columns=[column],
                        message=f"{profile.null_count} missing values found in {column}",
                        metadata={"null_pct": profile.null_pct},
                    )
                )
                penalties += min(profile.null_pct, 20)

            if profile.unique_count == 1:
                findings.append(
                    Finding(
                        issue_type="constant_column",
                        severity="medium",
                        affected_columns=[column],
                        message=f"{column} contains a single unique value",
                        metadata={"sample_values": profile.sample_values},
                    )
                )
                penalties += 10

        score = max(0.0, round(100.0 - penalties, 2))
        status = "COMPLETED"
        return AuditResult(
            auditor_name=self.name,
            score=score,
            findings=findings,
            execution_time=0.0,
            status=status,
        )
