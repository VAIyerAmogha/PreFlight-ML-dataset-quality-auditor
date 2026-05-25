from __future__ import annotations

import json
import zipfile

import pandas as pd

from preflight.export.export_builder import ExportBuilder
from preflight.export.preprocessing_applicator import ApplicatorStepLog
from preflight.reporting.schemas import AuditReportSchema
from preflight.suggestions.schemas import Suggestion


def _report() -> AuditReportSchema:
    return AuditReportSchema(
        job_id="job-1",
        filename="data.csv",
        status="COMPLETED",
        progress=100,
        score=88.0,
        interpretation_label="Excellent",
        findings=[],
        auditor_results=[],
        created_at="2026-05-24T00:00:00Z",
    )


def test_export_bundle_contains_expected_files(tmp_path) -> None:
    df = pd.DataFrame({"a": [1, 2, 3]})
    suggestions = [
        Suggestion(id="suggestion_1", title="t", severity="low", affected_columns=["a"], explanation="", code="df['a'] = df['a'] + 1", expected_impact=""),
    ]
    logs = [ApplicatorStepLog(suggestion_id="suggestion_1", title="t", applied=True)]

    zip_path = ExportBuilder().build(tmp_path, df, _report(), suggestions, logs)

    assert zip_path.exists()
    with zipfile.ZipFile(zip_path, "r") as archive:
        names = set(archive.namelist())
    assert names == {"cleaned_dataset.csv", "preprocessing_pipeline.py", "audit_report.json"}


def test_zip_is_valid_and_extractable(tmp_path) -> None:
    df = pd.DataFrame({"a": [1, 2, 3]})
    suggestions = []
    logs = []

    zip_path = ExportBuilder().build(tmp_path, df, _report(), suggestions, logs)
    extract_dir = tmp_path / "extract"
    extract_dir.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(zip_path, "r") as archive:
        archive.extractall(extract_dir)

    assert (extract_dir / "cleaned_dataset.csv").exists()
    assert (extract_dir / "preprocessing_pipeline.py").exists()
    report_payload = json.loads((extract_dir / "audit_report.json").read_text(encoding="utf-8"))
    assert report_payload["job_id"] == "job-1"
