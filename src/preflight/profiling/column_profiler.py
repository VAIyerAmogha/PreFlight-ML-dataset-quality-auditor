from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import pandas as pd

from preflight.core.models import ColumnProfile


@dataclass(slots=True)
class ColumnProfiler:
    sample_size: int = 5

    def profile_dataframe(self, df: pd.DataFrame) -> dict[str, ColumnProfile]:
        return {column: self.profile_series(df[column]) for column in df.columns}

    def profile_series(self, series: pd.Series) -> ColumnProfile:
        cleaned = series.dropna()
        sample_values = cleaned.head(self.sample_size).tolist()
        stats = self._build_stats(series, cleaned)

        return ColumnProfile(
            dtype=self._infer_dtype(series),
            null_count=int(series.isna().sum()),
            null_pct=self._null_pct(series),
            unique_count=int(series.nunique(dropna=True)),
            sample_values=sample_values,
            stats=stats,
        )

    def generate_summary(self, df: pd.DataFrame) -> dict[str, Any]:
        profiles = self.profile_dataframe(df)
        return {
            "row_count": int(len(df.index)),
            "column_count": int(len(df.columns)),
            "columns": {
                column: {
                    "dtype": profile.dtype,
                    "null_pct": profile.null_pct,
                    "unique_count": profile.unique_count,
                    "sample_values": profile.sample_values,
                }
                for column, profile in profiles.items()
            },
        }

    def _infer_dtype(self, series: pd.Series) -> str:
        if pd.api.types.is_bool_dtype(series):
            return "bool"
        if pd.api.types.is_integer_dtype(series):
            return "int"
        if pd.api.types.is_float_dtype(series):
            return "float"
        if pd.api.types.is_datetime64_any_dtype(series):
            return "datetime"
        return "string"

    def _null_pct(self, series: pd.Series) -> float:
        if len(series.index) == 0:
            return 0.0
        return float(series.isna().mean() * 100)

    def _build_stats(self, series: pd.Series, cleaned: pd.Series) -> dict[str, Any]:
        if cleaned.empty:
            return {}

        stats: dict[str, Any] = {}
        if pd.api.types.is_numeric_dtype(series):
            stats.update(
                {
                    "min": self._safe_float(cleaned.min()),
                    "max": self._safe_float(cleaned.max()),
                    "mean": self._safe_float(cleaned.mean()),
                    "std": self._safe_float(cleaned.std(ddof=0)),
                }
            )
        elif pd.api.types.is_datetime64_any_dtype(series):
            stats.update(
                {
                    "min": cleaned.min().isoformat(),
                    "max": cleaned.max().isoformat(),
                }
            )
        else:
            lengths = cleaned.astype(str).str.len()
            stats.update(
                {
                    "min_length": int(lengths.min()),
                    "max_length": int(lengths.max()),
                    "most_common": cleaned.astype(str).mode().iloc[0],
                }
            )

        return stats

    def _safe_float(self, value: Any) -> float | None:
        if pd.isna(value):
            return None
        return float(value)
