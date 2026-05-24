from __future__ import annotations

import pandas as pd

from preflight.auditors.label_noise import LabelNoiseAuditor


def test_label_noise_clean_dataset_has_no_findings() -> None:
    df = pd.DataFrame(
        {
            "label": [0, 0, 1, 1, 0, 1],
            "feature": [0.0, 0.2, 0.8, 0.9, 0.1, 1.0],
        }
    )

    result = LabelNoiseAuditor().run(df, {"target_column": "label"})

    assert result.findings == []
    assert result.score == 100.0


def test_label_noise_warns_on_boundary_label_noise() -> None:
    df = pd.DataFrame(
        {
            "label": [0, 0, 0, 1, 1, 1],
            "feature": [0.0, 0.1, 0.2, 0.8, 0.9, 0.95],
        }
    )
    df.loc[2, "label"] = 1

    result = LabelNoiseAuditor().run(df, {"target_column": "label"})

    assert len(result.findings) == 1
    assert result.findings[0].severity == "medium"
    assert result.findings[0].metadata["noise_rate"] == 16.67


def test_label_noise_flags_severe_mislabeled_samples() -> None:
    df = pd.DataFrame(
        {
            "label": [0, 0, 0, 0, 1, 1, 1, 1],
            "feature": [0.0, 0.1, 0.2, 0.15, 0.8, 0.9, 0.95, 0.85],
        }
    )
    df.loc[[1, 2, 6], "label"] = [1, 1, 0]

    result = LabelNoiseAuditor().run(df, {"target_column": "label"})

    assert result.findings[0].severity in {"high", "critical"}
    assert result.findings[0].metadata["suspected_rows"]
