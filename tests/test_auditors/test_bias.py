from __future__ import annotations

import pandas as pd

from preflight.auditors.bias import BiasAuditor


def test_bias_clean_dataset_has_no_findings() -> None:
    df = pd.DataFrame(
        {
            "target": [0, 1, 0, 1, 0, 1],
            "protected": ["a", "a", "b", "b", "c", "c"],
        }
    )

    result = BiasAuditor().run(
        df,
        {"target_column": "target", "protected_attributes": ["protected"]},
    )

    assert result.findings == []
    assert result.score == 100.0


def test_bias_warns_on_boundary_subgroup_imbalance() -> None:
    df = pd.DataFrame(
        {
            "target": [0, 1, 0, 1, 0, 1, 0, 1],
            "protected": ["a", "a", "a", "a", "a", "b", "b", "b"],
        }
    )

    result = BiasAuditor().run(
        df,
        {"target_column": "target", "protected_attributes": ["protected"]},
    )

    assert any(finding.issue_type == "subgroup_imbalance" for finding in result.findings)
    assert any(finding.severity == "medium" for finding in result.findings)


def test_bias_flags_severe_demographic_parity_gap() -> None:
    df = pd.DataFrame(
        {
            "target": [1, 1, 1, 1, 0, 0, 0, 0],
            "protected": ["group_a", "group_a", "group_a", "group_a", "group_b", "group_b", "group_b", "group_b"],
        }
    )

    result = BiasAuditor().run(
        df,
        {"target_column": "target", "protected_attributes": ["protected"]},
    )

    assert any(finding.issue_type == "demographic_parity_difference" for finding in result.findings)
    assert any(finding.severity == "critical" for finding in result.findings)
