from pathlib import Path

import pandas as pd
import pytest

from preflight.ingestion.dataset_ingester import DatasetIngestError, DatasetIngester


def test_ingest_reads_valid_csv(tmp_path: Path) -> None:
    csv_path = tmp_path / "sample.csv"
    csv_path.write_text("name,age\nAda,36\nGrace,40\n", encoding="utf-8")

    ingester = DatasetIngester()
    df = ingester.ingest(csv_path)

    assert list(df.columns) == ["name", "age"]
    assert df.shape == (2, 2)
    assert df.iloc[0]["name"] == "Ada"


def test_ingest_rejects_non_csv(tmp_path: Path) -> None:
    file_path = tmp_path / "sample.txt"
    file_path.write_text("not,a,csv", encoding="utf-8")

    ingester = DatasetIngester()

    with pytest.raises(DatasetIngestError, match="Only CSV files are supported"):
        ingester.ingest(file_path)


def test_ingest_rejects_empty_csv(tmp_path: Path) -> None:
    csv_path = tmp_path / "empty.csv"
    csv_path.write_text("name,age\n", encoding="utf-8")

    ingester = DatasetIngester()

    with pytest.raises(DatasetIngestError, match="contains no data"):
        ingester.ingest(csv_path)


def test_ingest_rejects_oversized_file(tmp_path: Path) -> None:
    csv_path = tmp_path / "big.csv"
    csv_path.write_text("a\n1\n", encoding="utf-8")

    ingester = DatasetIngester(max_file_size_mb=0)

    with pytest.raises(DatasetIngestError, match="exceeds size limit"):
        ingester.ingest(csv_path)
