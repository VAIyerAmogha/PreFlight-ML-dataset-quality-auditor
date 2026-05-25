from __future__ import annotations

import pandas as pd

from preflight.export.preprocessing_applicator import PreprocessingApplicator
from preflight.suggestions.schemas import Suggestion


def test_applicator_applies_suggestions_in_order() -> None:
    df = pd.DataFrame({"a": [1, 2, 3]})
    suggestions = [
        Suggestion(id="suggestion_1", title="step1", severity="low", affected_columns=["a"], explanation="", code="df['a'] = df['a'] * 2", expected_impact=""),
        Suggestion(id="suggestion_2", title="step2", severity="low", affected_columns=["a"], explanation="", code="df['a'] = df['a'] + 1", expected_impact=""),
    ]

    processed, logs = PreprocessingApplicator().apply(df, suggestions)

    assert processed["a"].tolist() == [3, 5, 7]
    assert all(log.applied for log in logs)


def test_applicator_skips_failing_step_without_crashing() -> None:
    df = pd.DataFrame({"a": [1, 2, 3]})
    suggestions = [
        Suggestion(id="suggestion_1", title="bad", severity="low", affected_columns=["a"], explanation="", code="df['b'] = df['missing']", expected_impact=""),
        Suggestion(id="suggestion_2", title="good", severity="low", affected_columns=["a"], explanation="", code="df['a'] = df['a'] + 5", expected_impact=""),
    ]

    processed, logs = PreprocessingApplicator().apply(df, suggestions)

    assert processed["a"].tolist() == [6, 7, 8]
    assert logs[0].applied is False
    assert logs[0].error is not None
    assert logs[1].applied is True
