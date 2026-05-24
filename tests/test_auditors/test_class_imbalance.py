from __future__ import annotations

import pandas as pd
import pytest

from preflight.auditors.class_imbalance import ClassImbalanceAuditor


def test_class_imbalance_balanced_classes_has_no_findings() -> None:
    df = pd.DataFrame({"label": [0, 1, 0, 1, 0, 1], "feature": [10, 11, 12, 13, 14, 15]})

    result = ClassImbalanceAuditor().run(df, {"target_column": "label"})

    assert result.findings == []
    assert result.score == 100.0


def test_class_imbalance_warns_on_moderate_imbalance() -> None:
    df = pd.DataFrame({"label": [0] * 8 + [1] * 2, "feature": range(10)})

    result = ClassImbalanceAuditor().run(df, {"target_column": "label"})

    assert len(result.findings) == 1
    assert result.findings[0].severity == "medium"
    assert result.findings[0].metadata["minority_class"] == 1
    assert result.findings[0].metadata["imbalance_ratio"] == 0.25


def test_class_imbalance_flags_extreme_skewed_regression_target() -> None:
    df = pd.DataFrame({"target": [1] * 50 + [100000], "feature": range(51)})

    result = ClassImbalanceAuditor().run(df, {"target_column": "target", "target_type": "regression"})

    assert result.findings[0].issue_type == "target_skewness"
    assert result.findings[0].severity in {"high", "critical"}


def test_class_imbalance_requires_target_column() -> None:
    df = pd.DataFrame({"label": [0, 1]})

    with pytest.raises(ValueError, match="target_column is required"):
        ClassImbalanceAuditor().run(df, {})
