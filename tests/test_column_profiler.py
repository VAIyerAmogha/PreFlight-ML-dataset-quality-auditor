import pandas as pd

from preflight.profiling.column_profiler import ColumnProfiler


def test_profile_dataframe_builds_profiles() -> None:
    df = pd.DataFrame(
        {
            "age": [21, 25, None, 30],
            "city": ["NY", "SF", "NY", "LA"],
        }
    )

    profiler = ColumnProfiler(sample_size=2)
    profiles = profiler.profile_dataframe(df)

    assert set(profiles.keys()) == {"age", "city"}
    assert profiles["age"].dtype == "float"
    assert profiles["age"].null_count == 1
    assert profiles["age"].sample_values == [21.0, 25.0]
    assert profiles["city"].dtype == "string"
    assert profiles["city"].unique_count == 3


def test_generate_summary_returns_concise_overview() -> None:
    df = pd.DataFrame({"value": [1, 2, 3]})

    profiler = ColumnProfiler()
    summary = profiler.generate_summary(df)

    assert summary["row_count"] == 3
    assert summary["column_count"] == 1
    assert summary["columns"]["value"]["dtype"] == "int"
