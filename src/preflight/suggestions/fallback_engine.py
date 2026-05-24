from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from preflight.reporting.schemas import AuditReportSchema, FindingSchema
from preflight.suggestions.schemas import Suggestion


@dataclass(slots=True)
class RuleBasedFallbackEngine:
    def generate(self, report: AuditReportSchema) -> list[Suggestion]:
        suggestions: list[Suggestion] = []
        seen: set[tuple[str, tuple[str, ...], str]] = set()

        for finding in report.findings:
            suggestion = self._build_suggestion(finding)
            if suggestion is None:
                continue
            key = (suggestion.title, tuple(suggestion.affected_columns), suggestion.code)
            if key in seen:
                continue
            seen.add(key)
            suggestions.append(suggestion)

        return suggestions

    def _build_suggestion(self, finding: FindingSchema) -> Suggestion | None:
        issue = finding.issue_type.lower()
        columns = finding.affected_columns or []

        if "missing" in issue:
            return Suggestion(
                title=f"Impute missing values in {', '.join(columns) or 'selected columns'}",
                severity=finding.severity,
                affected_columns=columns,
                explanation="Fill numeric columns with the median and categorical columns with the mode.",
                code=self._missing_data_code(columns),
                expected_impact="Reduces missingness without discarding rows.",
            )
        if "duplicate" in issue:
            return Suggestion(
                title="Remove duplicate rows",
                severity=finding.severity,
                affected_columns=columns,
                explanation="Drop exact duplicates before modeling.",
                code="df = df.drop_duplicates().reset_index(drop=True)",
                expected_impact="Removes repeated rows that can bias training and evaluation.",
            )
        if "imbalance" in issue or "skewness" in issue:
            return Suggestion(
                title="Balance the target distribution",
                severity=finding.severity,
                affected_columns=columns,
                explanation="Apply SMOTE-style oversampling when available, with a safe fallback to random oversampling.",
                code=self._imbalance_code(columns, finding.metadata),
                expected_impact="Makes minority classes easier for the model to learn.",
            )
        if "leak" in issue:
            return Suggestion(
                title="Drop leakage-prone columns",
                severity=finding.severity,
                affected_columns=columns,
                explanation="Remove columns that directly or indirectly reveal the target.",
                code=self._leakage_code(columns),
                expected_impact="Prevents target leakage and overly optimistic validation scores.",
            )
        if "outlier" in issue:
            return Suggestion(
                title="Clip numeric outliers with IQR bounds",
                severity=finding.severity,
                affected_columns=columns,
                explanation="Winsorize numeric outliers to the 1.5 IQR range.",
                code=self._outlier_code(columns),
                expected_impact="Reduces the influence of extreme values while keeping rows intact.",
            )
        if "label_noise" in issue or "label" in issue:
            return Suggestion(
                title="Filter suspicious labels",
                severity=finding.severity,
                affected_columns=columns,
                explanation="Use Cleanlab if available, otherwise fall back to a simple centroid-based filter.",
                code=self._label_noise_code(columns),
                expected_impact="Removes likely mislabeled rows before training.",
            )
        if "bias" in issue or "parity" in issue or "subgroup" in issue:
            return Suggestion(
                title="Inspect protected subgroup balance",
                severity=finding.severity,
                affected_columns=columns,
                explanation="This issue should be reviewed rather than auto-fixed.",
                code=self._bias_code(columns),
                expected_impact="Creates a quick diagnostic view for fairness review.",
            )
        return None

    def _missing_data_code(self, columns: list[str]) -> str:
        cols = columns or "df.columns"
        return f"""import pandas as pd\n\ncolumns = {columns!r}\nfor column in columns:\n    if column not in df.columns:\n        continue\n    if pd.api.types.is_numeric_dtype(df[column]):\n        df[column] = df[column].fillna(df[column].median())\n    else:\n        mode = df[column].mode(dropna=True)\n        fill_value = mode.iloc[0] if not mode.empty else 'missing'\n        df[column] = df[column].fillna(fill_value)\n"""

    def _imbalance_code(self, columns: list[str], metadata: dict[str, Any]) -> str:
        target_column = columns[0] if columns else metadata.get("target_column", "target")
        return f"""import pandas as pd\n\n# SMOTE-style fallback for offline execution\ntarget_column = {target_column!r}\ntry:\n    from imblearn.over_sampling import SMOTE\n    features = df.drop(columns=[target_column])\n    target = df[target_column]\n    synthetic_features, synthetic_target = SMOTE(random_state=42).fit_resample(features, target)\n    df = synthetic_features.assign(**{{target_column: synthetic_target}})\nexcept Exception:\n    counts = df[target_column].value_counts()\n    if len(counts) > 1:\n        minority_label = counts.idxmin()\n        deficit = int(counts.max() - counts.min())\n        if deficit > 0:\n            minority_rows = df[df[target_column] == minority_label]\n            extra = minority_rows.sample(deficit, replace=True, random_state=42)\n            df = pd.concat([df, extra], ignore_index=True)\n"""

    def _leakage_code(self, columns: list[str]) -> str:
        return f"""columns = {columns!r}\ndf = df.drop(columns=[column for column in columns if column in df.columns], errors='ignore')\n"""

    def _outlier_code(self, columns: list[str]) -> str:
        return f"""import pandas as pd\n\nfor column in {columns!r}:\n    if column not in df.columns or not pd.api.types.is_numeric_dtype(df[column]):\n        continue\n    q1 = df[column].quantile(0.25)\n    q3 = df[column].quantile(0.75)\n    iqr = q3 - q1\n    if iqr == 0:\n        continue\n    lower = q1 - 1.5 * iqr\n    upper = q3 + 1.5 * iqr\n    df[column] = df[column].clip(lower, upper)\n"""

    def _label_noise_code(self, columns: list[str]) -> str:
        target_column = columns[0] if columns else "target"
        return f"""import pandas as pd\n\ntarget_column = {target_column!r}\ntry:\n    from cleanlab.filter import find_label_issues\n    labels = df[target_column].astype('category').cat.codes\n    mask = find_label_issues(labels=labels.to_numpy(), pred_probs=None)\n    df = df.loc[~mask].reset_index(drop=True)\nexcept Exception:\n    feature_frame = df.drop(columns=[target_column], errors='ignore')\n    if not feature_frame.empty and target_column in df.columns:\n        numeric_features = feature_frame.select_dtypes(include='number')\n        if not numeric_features.empty:\n            centroids = numeric_features.groupby(df[target_column]).mean(numeric_only=True)\n            keep_rows = []\n            for index, row in numeric_features.iterrows():\n                distances = ((centroids - row) ** 2).sum(axis=1)\n                keep_rows.append(distances.idxmin() == df[target_column].iloc[index])\n            df = df.loc[keep_rows].reset_index(drop=True)\n"""

    def _bias_code(self, columns: list[str]) -> str:
        return f"""# Review subgroup counts manually; this suggestion is intentionally non-destructive.\nfor column in {columns!r}:\n    if column in df.columns:\n        print(df[column].value_counts(dropna=False))\n"""
