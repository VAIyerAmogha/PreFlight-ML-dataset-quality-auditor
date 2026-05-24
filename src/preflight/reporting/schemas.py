from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class FindingSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    issue_type: str
    severity: str
    affected_columns: list[str]
    message: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class AuditorResultSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    auditor_name: str
    score: float
    findings: list[FindingSchema] = Field(default_factory=list)
    execution_time: float
    status: str
    progress: int
    error: str | None = None


class ScoreBreakdownSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    auditor_name: str
    weight: float
    score: float
    weighted_score: float
    penalty: float


class AuditReportSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    schema_version: str = "1.0"
    job_id: str
    filename: str
    status: str
    progress: int
    score: float
    interpretation_label: str = "Poor"
    score_breakdown: list[ScoreBreakdownSchema] = Field(default_factory=list)
    findings: list[FindingSchema] = Field(default_factory=list)
    auditor_results: list[AuditorResultSchema] = Field(default_factory=list)
    created_at: str
    started_at: str | None = None
    completed_at: str | None = None
    error: str | None = None


class JobStatusSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    job_id: str
    filename: str
    status: str
    progress: int
    created_at: str
    started_at: str | None = None
    completed_at: str | None = None
    error: str | None = None
    report_ready: bool = False


class UploadResponseSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    job_id: str
    status: str
    message: str
