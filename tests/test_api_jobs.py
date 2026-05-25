from __future__ import annotations

from pathlib import Path
import time
import io
import zipfile

from fastapi.testclient import TestClient

from preflight.api.main import create_app


def _build_client(tmp_path: Path) -> TestClient:
    app = create_app(
        db_path=tmp_path / "preflight.sqlite3",
        upload_dir=tmp_path / "uploads",
        max_workers=2,
    )
    return TestClient(app)


def _wait_for_status(client: TestClient, job_id: str, expected: set[str]) -> dict:
    deadline = time.time() + 5
    latest: dict | None = None
    while time.time() < deadline:
        response = client.get(f"/jobs/{job_id}")
        assert response.status_code == 200
        latest = response.json()
        if latest["status"] in expected:
            return latest
        time.sleep(0.05)
    raise AssertionError(f"Job did not reach {expected}: {latest}")


def test_upload_dispatches_job_and_returns_report(tmp_path: Path) -> None:
    client = _build_client(tmp_path)
    csv_bytes = b"name,age,city\nAda,36,London\nGrace,,London\n"

    response = client.post(
        "/upload",
        files={"file": ("sample.csv", csv_bytes, "text/csv")},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "PENDING"
    job_id = body["job_id"]

    job = _wait_for_status(client, job_id, {"COMPLETED"})
    assert job["progress"] == 100
    assert job["report_ready"] is True

    report_response = client.get(f"/jobs/{job_id}/report")
    assert report_response.status_code == 200
    report = report_response.json()
    assert report["job_id"] == job_id
    assert report["status"] == "COMPLETED"
    assert report["findings"]
    assert report["auditor_results"]
    assert report["schema_version"] == "1.0"


def test_job_status_and_report_are_stable(tmp_path: Path) -> None:
    client = _build_client(tmp_path)
    csv_bytes = b"name,age\nAda,36\nGrace,36\n"

    upload = client.post(
        "/upload",
        files={"file": ("audit.csv", csv_bytes, "text/csv")},
    )
    assert upload.status_code == 200
    job_id = upload.json()["job_id"]

    job = _wait_for_status(client, job_id, {"COMPLETED"})
    assert job["job_id"] == job_id
    assert job["filename"] == "audit.csv"

    report = client.get(f"/jobs/{job_id}/report")
    assert report.status_code == 200
    payload = report.json()
    assert set(payload.keys()) == {
        "schema_version",
        "job_id",
        "filename",
        "status",
        "progress",
        "score",
        "interpretation_label",
        "score_breakdown",
        "findings",
        "auditor_results",
        "created_at",
        "started_at",
        "completed_at",
        "error",
    }


def test_corrupted_upload_runs_all_auditors_and_persists_report(tmp_path: Path) -> None:
    client = _build_client(tmp_path)
    csv_bytes = b"target,protected,feature_a,feature_b,target_ratio,future_feature\n0,a,10,1,0.1,0\n0,a,10,1,0.1,0\n0,a,10,1,0.1,0\n0,b,10,1,0.9,1\n1,b,10,1,0.9,1\n1,b,10,1,0.9,1\n1,b,10,1,0.9,1\n0,c,,,0.1,0\n1,c,200,300,0.9,1\n1,d,10,1,0.9,1\n"

    upload = client.post(
        "/upload",
        files={"file": ("corrupted.csv", csv_bytes, "text/csv")},
    )
    assert upload.status_code == 200
    job_id = upload.json()["job_id"]

    job = _wait_for_status(client, job_id, {"COMPLETED"})
    assert job["status"] == "COMPLETED"
    assert job["report_ready"] is True
    assert job["progress"] == 100

    report_response = client.get(f"/jobs/{job_id}/report")
    assert report_response.status_code == 200
    report = report_response.json()

    auditor_names = {item["auditor_name"] for item in report["auditor_results"]}
    assert auditor_names == {
        "bias",
        "class_imbalance",
        "data_leakage",
        "duplicates",
        "label_noise",
        "missing_data",
        "outliers",
    }
    assert len(report["score_breakdown"]) == 7
    assert report["interpretation_label"] in {"Poor", "Fair", "Good", "Excellent"}
    assert report["findings"]

    stored_report = client.app.state.job_store.fetch_report(job_id)
    assert stored_report.job_id == job_id
    assert stored_report.score_breakdown
    assert stored_report.auditor_results


def test_suggestions_endpoint_returns_validated_recommendations(tmp_path: Path) -> None:
    client = _build_client(tmp_path)
    csv_bytes = b"name,age,score\nAda,36,10\nAda,36,10\nGrace,,99\nGrace,,99\n"

    upload = client.post(
        "/upload",
        files={"file": ("recommend.csv", csv_bytes, "text/csv")},
    )
    assert upload.status_code == 200
    job_id = upload.json()["job_id"]

    _wait_for_status(client, job_id, {"COMPLETED"})

    response = client.get(f"/jobs/{job_id}/suggestions")
    assert response.status_code == 200
    suggestions = response.json()
    assert suggestions
    assert all(suggestion["code"].strip() for suggestion in suggestions)


def test_export_endpoint_returns_valid_zip(tmp_path: Path) -> None:
    client = _build_client(tmp_path)
    csv_bytes = b"target,feature_a,feature_b\n0,1,2\n1,2,3\n0,1,1\n1,3,4\n0,0,1\n1,4,5\n"

    upload = client.post(
        "/upload",
        files={"file": ("export.csv", csv_bytes, "text/csv")},
    )
    assert upload.status_code == 200
    job_id = upload.json()["job_id"]

    _wait_for_status(client, job_id, {"COMPLETED"})

    suggestions = client.get(f"/jobs/{job_id}/suggestions").json()
    accepted_ids = [suggestions[0]["id"]] if suggestions else []

    response = client.post(
        f"/jobs/{job_id}/export",
        json={"accepted_suggestion_ids": accepted_ids, "target_column": "target"},
    )
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/zip")

    archive = zipfile.ZipFile(io.BytesIO(response.content))
    assert set(archive.namelist()) == {
        "cleaned_dataset.csv",
        "preprocessing_pipeline.py",
        "audit_report.json",
    }
