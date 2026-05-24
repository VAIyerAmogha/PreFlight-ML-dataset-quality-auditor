from __future__ import annotations

import subprocess
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import pandas as pd

from preflight.suggestions.schemas import Suggestion


@dataclass(slots=True)
class ValidationResult:
    passed: bool
    error: str | None = None


@dataclass(slots=True)
class CodeValidator:
    timeout_seconds: float = 3.0

    def validate(self, suggestion: Suggestion, columns: list[str] | None = None) -> ValidationResult:
        sample_df = self._build_sample_dataframe(columns or suggestion.affected_columns)
        script = self._build_script(suggestion.code, sample_df)

        with tempfile.TemporaryDirectory() as temp_dir:
            script_path = Path(temp_dir) / "validate_suggestion.py"
            script_path.write_text(script, encoding="utf-8")
            try:
                completed = subprocess.run(
                    [sys.executable, str(script_path)],
                    capture_output=True,
                    text=True,
                    timeout=self.timeout_seconds,
                    check=False,
                )
            except subprocess.TimeoutExpired:
                return ValidationResult(False, "Validation timed out")

        if completed.returncode != 0:
            error_output = completed.stderr.strip() or completed.stdout.strip() or "Validation failed"
            return ValidationResult(False, error_output)
        return ValidationResult(True, None)

    def filter_valid(self, suggestions: list[Suggestion], columns: list[str] | None = None) -> list[Suggestion]:
        valid: list[Suggestion] = []
        for suggestion in suggestions:
            if self.validate(suggestion, columns).passed:
                valid.append(suggestion)
        return valid

    def _build_sample_dataframe(self, columns: list[str]) -> pd.DataFrame:
        column_names = list(dict.fromkeys([*columns, "target", "label", "protected", "feature_a", "feature_b"]))
        data: dict[str, list[Any]] = {}
        for column in column_names:
            if any(token in column.lower() for token in ["target", "label"]):
                data[column] = [0, 1] * 25
            elif any(token in column.lower() for token in ["protected", "group", "gender", "race", "sex"]):
                data[column] = (["a", "b", "c", "a", "b"] * 10)[:50]
            elif any(token in column.lower() for token in ["date", "time", "timestamp"]):
                data[column] = pd.date_range("2024-01-01", periods=50, freq="D").astype(str).tolist()
            else:
                data[column] = list(range(50))
        return pd.DataFrame(data)

    def _build_script(self, code: str, sample_df: pd.DataFrame) -> str:
        sample_dict = sample_df.to_dict(orient="list")
        return f"""
import pandas as pd

sample_data = {sample_dict!r}
df = pd.DataFrame(sample_data)
{code}
print('ok')
"""
