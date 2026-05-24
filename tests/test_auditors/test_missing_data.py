from __future__ import annotations

import pandas as pd

from preflight.auditors.missing_data import MissingDataAuditor


def test_missing_data_clean_dataset_has_no_findings() -> None:
    df = pd.DataFrame({"a": [1, 2, 3], "b": ["x", "y", "z"]})

    result = MissingDataAuditor().run(df, {})

    assert result.score == 100.0
    assert result.findings == []
    assert result.status == "COMPLETED"


def test_missing_data_detects_block_pattern_and_high_severity() -> None:
    df = pd.DataFrame({"a": [1, None, None, None, 5, 6, 7, 8, 9, 10], "b": [10, 11, 12, 13, 14, 15, 16, 17, 18, 19]})

    result = MissingDataAuditor().run(df, {})

    assert len(result.findings) == 1
    finding = result.findings[0]
    assert finding.issue_type == "missing_data"
    assert finding.severity == "high"
    assert finding.metadata["pattern"] == "block"
    assert finding.metadata["heuristic"] == "mar"


def test_missing_data_detects_critical_sparse_missingness() -> None:
    df = pd.DataFrame({"a": [None, None, None, None, None, 1]})

    result = MissingDataAuditor().run(df, {})

    assert result.findings[0].severity == "critical"
    assert result.score < 100.0
