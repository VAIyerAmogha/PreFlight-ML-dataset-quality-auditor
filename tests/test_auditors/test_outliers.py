from __future__ import annotations

import pandas as pd

from preflight.auditors.outliers import OutliersAuditor


def test_outliers_clean_dataset_has_no_findings() -> None:
    df = pd.DataFrame(
        {
            "x": [10, 11, 12, 13, 14, 15],
            "y": [20, 21, 22, 23, 24, 25],
        }
    )

    result = OutliersAuditor().run(df, {})

    assert result.findings == []
    assert result.score == 100.0


def test_outliers_warns_on_boundary_univariate_outlier() -> None:
    df = pd.DataFrame(
        {
            "x": list(range(10, 29)) + [100],
            "y": list(range(20, 39)) + [200],
        }
    )

    result = OutliersAuditor().run(df, {})

    assert any(finding.issue_type == "univariate_outliers" for finding in result.findings)
    assert any(finding.severity == "medium" for finding in result.findings)


def test_outliers_flags_severe_multivariate_outlier() -> None:
    df = pd.DataFrame(
        {
            "x": [10, 11, 12, 13, 14, 15, 16, 200],
            "y": [20, 21, 22, 23, 24, 25, 26, 400],
        }
    )

    result = OutliersAuditor().run(df, {})

    assert any(finding.issue_type == "multivariate_outliers" for finding in result.findings)
    assert result.score < 100.0
