from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True)
class Finding:
    issue_type: str
    severity: str
    affected_columns: list[str]
    message: str
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class AuditResult:
    auditor_name: str
    score: float
    findings: list[Finding]
    execution_time: float
    status: str


@dataclass(slots=True)
class ColumnProfile:
    dtype: str
    null_count: int
    null_pct: float
    unique_count: int
    sample_values: list[Any]
    stats: dict[str, Any] = field(default_factory=dict)
