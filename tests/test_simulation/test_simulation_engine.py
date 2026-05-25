from __future__ import annotations

import numpy as np
import pandas as pd

from preflight.simulation.simulation_engine import SimulationEngine


def test_classification_simulation_returns_expected_metrics() -> None:
    rng = np.random.default_rng(42)
    n = 120
    x1 = rng.normal(size=n)
    x2 = rng.normal(size=n)
    target = (x1 + x2 > 0.5).astype(int)

    before = pd.DataFrame({"feature_a": x1, "feature_b": x2, "target": target})
    after = before.copy()

    result = SimulationEngine().run(before, after, "target")

    assert result.task_type == "classification"
    assert set(result.before_metrics.keys()) == {"f1_macro", "auc_roc", "mcc"}
    assert "f1_macro" in result.p_values


def test_regression_simulation_returns_expected_metrics() -> None:
    rng = np.random.default_rng(7)
    n = 140
    x1 = rng.normal(size=n)
    x2 = rng.normal(size=n)
    target = 3.0 * x1 - 2.5 * x2 + rng.normal(scale=0.5, size=n)

    before = pd.DataFrame({"feature_a": x1, "feature_b": x2, "target": target})
    after = before.copy()

    result = SimulationEngine().run(before, after, "target")

    assert result.task_type == "regression"
    assert set(result.before_metrics.keys()) == {"rmse", "mae", "r2"}
    assert "rmse" in result.p_values


def test_before_after_delta_positive_when_quality_improves() -> None:
    rng = np.random.default_rng(11)
    n = 150
    x1 = rng.normal(size=n)
    x2 = rng.normal(size=n)
    target = (x1 * 0.9 + x2 * 0.4 > 0.2).astype(int)

    before = pd.DataFrame({"feature_a": x1, "feature_b": rng.normal(size=n), "target": target})
    after = pd.DataFrame({"feature_a": x1, "feature_b": x2, "target": target})

    result = SimulationEngine().run(before, after, "target")

    assert result.deltas["f1_macro"] > 0


def test_p_value_is_present() -> None:
    rng = np.random.default_rng(21)
    n = 110
    x1 = rng.normal(size=n)
    x2 = rng.normal(size=n)
    target = (x1 - x2 > 0.0).astype(int)

    before = pd.DataFrame({"feature_a": x1, "feature_b": x2, "target": target})
    after = before.copy()

    result = SimulationEngine().run(before, after, "target")

    assert all(metric in result.p_values for metric in ["f1_macro", "auc_roc", "mcc"])
