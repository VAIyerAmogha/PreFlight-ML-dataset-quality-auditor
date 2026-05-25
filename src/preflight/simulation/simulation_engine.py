from __future__ import annotations

from dataclasses import dataclass
import hashlib
import re
from math import sqrt

import numpy as np
import pandas as pd
from lightgbm import LGBMClassifier, LGBMRegressor
from scipy.stats import ttest_rel
from sklearn.metrics import (
    f1_score,
    matthews_corrcoef,
    mean_absolute_error,
    mean_squared_error,
    r2_score,
    roc_auc_score,
)
from sklearn.model_selection import KFold, StratifiedKFold

from preflight.simulation.schemas import MetricStats, SimulationResult


@dataclass(slots=True)
class SimulationEngine:
    random_state: int = 42
    n_splits: int = 5

    def run(self, before_df: pd.DataFrame, after_df: pd.DataFrame, target_column: str) -> SimulationResult:
        if target_column not in before_df.columns or target_column not in after_df.columns:
            raise ValueError(f"Target column not found: {target_column}")

        task_type = self._detect_task_type(before_df[target_column])
        before_x, before_y = self._prepare_data(before_df, target_column, task_type)
        after_x, after_y = self._prepare_data(after_df, target_column, task_type)

        before_x, after_x = self._align_features(before_x, after_x)
        metrics = self._metric_names(task_type)
        per_fold_before = {metric: [] for metric in metrics}
        per_fold_after = {metric: [] for metric in metrics}

        splits = list(self._build_splitter(before_y, task_type))
        for train_idx, test_idx in splits:
            fold_before = self._evaluate_fold(before_x, before_y, train_idx, test_idx, task_type)
            fold_after = self._evaluate_fold(after_x, after_y, train_idx, test_idx, task_type)
            for metric in metrics:
                per_fold_before[metric].append(fold_before[metric])
                per_fold_after[metric].append(fold_after[metric])

        before_metrics = {metric: self._stats(values) for metric, values in per_fold_before.items()}
        after_metrics = {metric: self._stats(values) for metric, values in per_fold_after.items()}
        deltas = {
            metric: round(after_metrics[metric].mean - before_metrics[metric].mean, 6)
            for metric in metrics
        }
        p_values = {
            metric: self._p_value(per_fold_before[metric], per_fold_after[metric])
            for metric in metrics
        }

        return SimulationResult(
            task_type=task_type,
            before_metrics=before_metrics,
            after_metrics=after_metrics,
            deltas=deltas,
            p_values=p_values,
        )

    def _detect_task_type(self, target: pd.Series) -> str:
        cleaned = target.dropna()
        if cleaned.empty:
            raise ValueError("Target column is empty")
        if pd.api.types.is_numeric_dtype(cleaned) and cleaned.nunique(dropna=True) > 10:
            return "regression"
        return "classification"

    def _prepare_data(self, df: pd.DataFrame, target_column: str, task_type: str) -> tuple[pd.DataFrame, pd.Series]:
        features = df.drop(columns=[target_column])
        features = pd.get_dummies(features, dummy_na=True)
        features = self._sanitize_feature_names(features)

        target = df[target_column]
        if task_type == "classification":
            target = target.astype("category").cat.codes.astype(int)
        else:
            target = pd.to_numeric(target, errors="coerce")
        mask = target.notna()
        return features.loc[mask].reset_index(drop=True), target.loc[mask].reset_index(drop=True)

    def _sanitize_feature_names(self, features: pd.DataFrame) -> pd.DataFrame:
        sanitized_columns: list[str] = []
        for column in features.columns:
            raw_name = str(column)
            safe_name = re.sub(r"[^0-9A-Za-z_]+", "_", raw_name).strip("_")
            if not safe_name:
                safe_name = "feature"
            if safe_name[0].isdigit():
                safe_name = f"f_{safe_name}"
            suffix = hashlib.sha1(raw_name.encode("utf-8")).hexdigest()[:8]
            sanitized_columns.append(f"{safe_name}__{suffix}")

        sanitized = features.copy()
        sanitized.columns = sanitized_columns
        return sanitized

    def _align_features(self, before_x: pd.DataFrame, after_x: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
        all_columns = sorted(set(before_x.columns).union(after_x.columns))
        before_aligned = before_x.reindex(columns=all_columns, fill_value=0)
        after_aligned = after_x.reindex(columns=all_columns, fill_value=0)
        return before_aligned, after_aligned

    def _metric_names(self, task_type: str) -> list[str]:
        if task_type == "classification":
            return ["f1_macro", "auc_roc", "mcc"]
        return ["rmse", "mae", "r2"]

    def _build_splitter(self, y: pd.Series, task_type: str):
        if task_type == "classification":
            class_counts = y.value_counts()
            min_class_count = int(class_counts.min()) if not class_counts.empty else 2
            splits = max(2, min(self.n_splits, min_class_count))
            splitter = StratifiedKFold(n_splits=splits, shuffle=True, random_state=self.random_state)
            return splitter.split(np.zeros(len(y.index)), y)

        splits = max(2, min(self.n_splits, len(y.index)))
        splitter = KFold(n_splits=splits, shuffle=True, random_state=self.random_state)
        return splitter.split(np.zeros(len(y.index)))

    def _evaluate_fold(
        self,
        x: pd.DataFrame,
        y: pd.Series,
        train_idx: np.ndarray,
        test_idx: np.ndarray,
        task_type: str,
    ) -> dict[str, float]:
        x_train, x_test = x.iloc[train_idx], x.iloc[test_idx]
        y_train, y_test = y.iloc[train_idx], y.iloc[test_idx]

        if task_type == "classification":
            model = LGBMClassifier(
                random_state=self.random_state,
                n_estimators=120,
                learning_rate=0.05,
                num_leaves=31,
                subsample=1.0,
                colsample_bytree=1.0,
                verbosity=-1,
            )
            model.fit(x_train, y_train)
            predictions = model.predict(x_test)
            probabilities = model.predict_proba(x_test)
            if len(np.unique(y_test)) <= 1:
                auc = 0.5
            elif probabilities.shape[1] == 2:
                auc = float(roc_auc_score(y_test, probabilities[:, 1]))
            else:
                auc = float(roc_auc_score(y_test, probabilities, multi_class="ovr", average="macro"))
            return {
                "f1_macro": float(f1_score(y_test, predictions, average="macro")),
                "auc_roc": auc,
                "mcc": float(matthews_corrcoef(y_test, predictions)),
            }

        model = LGBMRegressor(
            random_state=self.random_state,
            n_estimators=120,
            learning_rate=0.05,
            num_leaves=31,
            subsample=1.0,
            colsample_bytree=1.0,
            verbosity=-1,
        )
        model.fit(x_train, y_train)
        predictions = model.predict(x_test)
        return {
            "rmse": float(sqrt(mean_squared_error(y_test, predictions))),
            "mae": float(mean_absolute_error(y_test, predictions)),
            "r2": float(r2_score(y_test, predictions)),
        }

    def _stats(self, values: list[float]) -> MetricStats:
        return MetricStats(
            mean=round(float(np.nanmean(values)), 6),
            std=round(float(np.nanstd(values)), 6),
        )

    def _p_value(self, before_values: list[float], after_values: list[float]) -> float:
        if len(before_values) != len(after_values) or not before_values:
            return 1.0
        if all(abs(before - after) < 1e-12 for before, after in zip(before_values, after_values)):
            return 1.0
        result = ttest_rel(before_values, after_values, nan_policy="omit")
        value = float(result.pvalue) if result.pvalue is not None else 1.0
        if np.isnan(value):
            return 1.0
        return round(value, 6)
