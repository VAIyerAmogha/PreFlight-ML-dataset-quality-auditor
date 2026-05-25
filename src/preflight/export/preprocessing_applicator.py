from __future__ import annotations

from dataclasses import dataclass

import pandas as pd

from preflight.suggestions.schemas import Suggestion


@dataclass(slots=True)
class ApplicatorStepLog:
    suggestion_id: str
    title: str
    applied: bool
    error: str | None = None


class PreprocessingApplicator:
    def apply(self, dataframe: pd.DataFrame, suggestions: list[Suggestion]) -> tuple[pd.DataFrame, list[ApplicatorStepLog]]:
        working = dataframe.copy()
        logs: list[ApplicatorStepLog] = []

        for suggestion in suggestions:
            environment = {"pd": pd, "df": working.copy()}
            try:
                exec(suggestion.code, {}, environment)
                updated_df = environment.get("df")
                if not isinstance(updated_df, pd.DataFrame):
                    raise ValueError("Suggestion code must keep `df` as a pandas DataFrame")
                working = updated_df
                logs.append(
                    ApplicatorStepLog(
                        suggestion_id=suggestion.id,
                        title=suggestion.title,
                        applied=True,
                        error=None,
                    )
                )
            except Exception as exc:  # noqa: BLE001
                logs.append(
                    ApplicatorStepLog(
                        suggestion_id=suggestion.id,
                        title=suggestion.title,
                        applied=False,
                        error=f"{type(exc).__name__}: {exc}",
                    )
                )

        return working, logs
