from __future__ import annotations

from pydantic import AliasChoices, BaseModel, ConfigDict, Field


class AcceptedSuggestionsRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    accepted_suggestion_ids: list[str] = Field(
        default_factory=list,
        validation_alias=AliasChoices("accepted_suggestion_ids", "accepted_ids"),
    )
    target_column: str | None = None
