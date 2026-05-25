from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class MetricStats(BaseModel):
    model_config = ConfigDict(extra="forbid")

    mean: float
    std: float


class SimulationResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    task_type: str
    before_metrics: dict[str, MetricStats] = Field(default_factory=dict)
    after_metrics: dict[str, MetricStats] = Field(default_factory=dict)
    deltas: dict[str, float] = Field(default_factory=dict)
    p_values: dict[str, float] = Field(default_factory=dict)
