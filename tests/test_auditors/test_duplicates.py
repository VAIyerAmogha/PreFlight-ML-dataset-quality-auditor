from __future__ import annotations

import pandas as pd

from preflight.auditors.duplicates import DuplicatesAuditor


def test_duplicates_clean_dataset_has_no_findings() -> None:
    df = pd.DataFrame({"a": [1, 2, 3], "b": ["x", "y", "z"]})

    result = DuplicatesAuditor().run(df, {})

    assert result.score == 100.0
    assert result.findings == []


def test_duplicates_warns_on_small_duplicate_rate() -> None:
    rows = [{"a": index, "b": f"value-{index}"} for index in range(48)]
    rows += [{"a": 99, "b": "dup"}, {"a": 99, "b": "dup"}]
    df = pd.DataFrame(rows)

    result = DuplicatesAuditor().run(df, {})

    assert len(result.findings) == 1
    assert result.findings[0].severity == "low"
    assert result.findings[0].metadata["duplicate_rate"] == 4.0


def test_duplicates_flags_severe_duplicate_rate() -> None:
    df = pd.DataFrame(
        {
            "a": [1, 1, 1, 2, 2, 2],
            "b": ["x", "x", "x", "y", "y", "y"],
        }
    )

    result = DuplicatesAuditor().run(df, {})

    assert result.findings[0].severity == "critical"
    assert result.score < 100.0
