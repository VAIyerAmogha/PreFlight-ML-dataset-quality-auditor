from __future__ import annotations

from preflight.suggestions.code_validator import CodeValidator
from preflight.suggestions.schemas import Suggestion


def test_code_validator_passes_clean_code() -> None:
    suggestion = Suggestion(
        title="Impute age",
        severity="medium",
        affected_columns=["age"],
        explanation="Fill missing values.",
        code="df['age'] = df['age'].fillna(df['age'].median())",
        expected_impact="Removes gaps.",
    )

    result = CodeValidator().validate(suggestion, ["age"])

    assert result.passed is True
    assert result.error is None


def test_code_validator_rejects_broken_code() -> None:
    suggestion = Suggestion(
        title="Broken",
        severity="low",
        affected_columns=["age"],
        explanation="Broken code.",
        code="df['age'] = df['missing'].fillna(df['missing'].median())",
        expected_impact="None.",
    )

    result = CodeValidator().validate(suggestion, ["age"])

    assert result.passed is False
    assert result.error
