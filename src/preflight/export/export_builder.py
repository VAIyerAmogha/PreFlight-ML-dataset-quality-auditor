from __future__ import annotations

import json
import zipfile
from pathlib import Path

import pandas as pd

from preflight.export.preprocessing_applicator import ApplicatorStepLog
from preflight.reporting.schemas import AuditReportSchema
from preflight.suggestions.schemas import Suggestion


class ExportBuilder:
    def build(
        self,
        output_dir: Path,
        cleaned_df: pd.DataFrame,
        report: AuditReportSchema,
        accepted_suggestions: list[Suggestion],
        logs: list[ApplicatorStepLog],
    ) -> Path:
        output_dir.mkdir(parents=True, exist_ok=True)
        csv_path = output_dir / "cleaned_dataset.csv"
        pipeline_path = output_dir / "preprocessing_pipeline.py"
        report_path = output_dir / "audit_report.json"
        zip_path = output_dir / "preflight_export_bundle.zip"

        cleaned_df.to_csv(csv_path, index=False)
        pipeline_path.write_text(self._pipeline_script(accepted_suggestions, logs), encoding="utf-8")
        report_payload = report.model_dump()
        report_payload["accepted_suggestion_ids"] = [suggestion.id for suggestion in accepted_suggestions]
        report_payload["application_logs"] = [
            {
                "suggestion_id": log.suggestion_id,
                "title": log.title,
                "applied": log.applied,
                "error": log.error,
            }
            for log in logs
        ]
        report_path.write_text(json.dumps(report_payload, indent=2), encoding="utf-8")

        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as archive:
            archive.write(csv_path, arcname="cleaned_dataset.csv")
            archive.write(pipeline_path, arcname="preprocessing_pipeline.py")
            archive.write(report_path, arcname="audit_report.json")

        return zip_path

    def _pipeline_script(self, suggestions: list[Suggestion], logs: list[ApplicatorStepLog]) -> str:
        lines = [
            "import pandas as pd",
            "",
            "",
            "def apply_pipeline(df: pd.DataFrame) -> pd.DataFrame:",
            "    working = df.copy()",
        ]

        applied_logs = {log.suggestion_id: log for log in logs}
        for suggestion in suggestions:
            log = applied_logs.get(suggestion.id)
            if log is not None and not log.applied:
                lines.append(f"    # Skipped {suggestion.id}: {log.error}")
                continue
            lines.append(f"    # {suggestion.id}: {suggestion.title}")
            lines.append("    df = working")
            for line in suggestion.code.splitlines():
                lines.append(f"    {line}")
            lines.append("    working = df")

        lines.extend(
            [
                "    return working",
                "",
                "",
                "if __name__ == '__main__':",
                "    source = 'input.csv'",
                "    target = 'cleaned_dataset.csv'",
                "    frame = pd.read_csv(source)",
                "    cleaned = apply_pipeline(frame)",
                "    cleaned.to_csv(target, index=False)",
            ]
        )
        return "\n".join(lines) + "\n"
