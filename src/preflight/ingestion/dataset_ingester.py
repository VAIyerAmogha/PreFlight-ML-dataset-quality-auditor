from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import pandas as pd
from charset_normalizer import from_path


class DatasetIngestError(ValueError):
    pass


@dataclass(slots=True)
class DatasetIngester:
    max_file_size_mb: int = 25
    max_rows: int | None = 1_000_000
    encoding_fallback: str = "utf-8"

    def ingest(self, file_path: str | Path, **read_csv_kwargs: Any) -> pd.DataFrame:
        path = Path(file_path)
        self._validate_path(path)
        self._validate_size(path)
        encoding = self._detect_encoding(path)

        try:
            df = pd.read_csv(path, encoding=encoding, **read_csv_kwargs)
        except Exception as exc:
            raise DatasetIngestError(f"Failed to read CSV: {path.name}") from exc

        self._validate_dataframe(df, path)
        return df

    def _validate_path(self, path: Path) -> None:
        if not path.exists():
            raise DatasetIngestError(f"File does not exist: {path}")
        if not path.is_file():
            raise DatasetIngestError(f"Path is not a file: {path}")
        if path.suffix.lower() != ".csv":
            raise DatasetIngestError("Only CSV files are supported")

    def _validate_size(self, path: Path) -> None:
        max_bytes = self.max_file_size_mb * 1024 * 1024
        if path.stat().st_size > max_bytes:
            raise DatasetIngestError(
                f"File exceeds size limit of {self.max_file_size_mb} MB"
            )

    def _detect_encoding(self, path: Path) -> str:
        result = from_path(path).best()
        if result is None or result.encoding is None:
            return self.encoding_fallback
        return result.encoding

    def _validate_dataframe(self, df: pd.DataFrame, path: Path) -> None:
        if df.empty:
            raise DatasetIngestError(f"CSV contains no data: {path.name}")
        if self.max_rows is not None and len(df.index) > self.max_rows:
            raise DatasetIngestError(
                f"CSV exceeds row limit of {self.max_rows:,} rows"
            )
        if df.columns.empty:
            raise DatasetIngestError("CSV must contain at least one column")
