from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class Suggestion(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str
    severity: str
    affected_columns: list[str] = Field(default_factory=list)
    explanation: str
    code: str
    expected_impact: str
