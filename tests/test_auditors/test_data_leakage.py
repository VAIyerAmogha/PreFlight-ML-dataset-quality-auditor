from __future__ import annotations

import pandas as pd

from preflight.auditors.data_leakage import DataLeakageAuditor


def test_data_leakage_clean_dataset_has_no_findings() -> None:
    df = pd.DataFrame(
        {
            "target": [0, 1, 0, 1, 0, 1],
            "feature_a": [3, 5, 2, 4, 6, 8],
            "feature_b": [10, 9, 8, 7, 6, 5],
        }
    )

    result = DataLeakageAuditor().run(df, {"target_column": "target"})

    assert result.findings == []
    assert result.score == 100.0


def test_data_leakage_detects_name_based_boundary_warning() -> None:
    df = pd.DataFrame(
        {
            "target": [0, 1, 0, 1, 0, 1],
            "target_ratio": [0.2, 0.8, 0.1, 0.9, 0.2, 0.8],
        }
    )

    result = DataLeakageAuditor().run(df, {"target_column": "target"})

    assert len(result.findings) == 2
    assert any(finding.issue_type == "derived_feature_leakage" for finding in result.findings)
    assert any(finding.issue_type == "near_perfect_predictor" for finding in result.findings)


def test_data_leakage_flags_near_perfect_predictor() -> None:
    df = pd.DataFrame(
        {
            "target": [0, 1, 0, 1, 0, 1],
            "future_feature": [0, 1, 0, 1, 0, 1],
        }
    )

    result = DataLeakageAuditor().run(df, {"target_column": "target"})

    assert any(finding.issue_type == "near_perfect_predictor" for finding in result.findings)
    assert result.score < 100.0
