from __future__ import annotations

import json
from typing import Any

from preflight.reporting.schemas import AuditReportSchema


class FindingsSerializer:
    def serialize(self, report: AuditReportSchema) -> dict[str, Any]:
        findings = []
        for auditor_result in report.auditor_results:
            if not auditor_result.findings:
                continue
            findings.append(
                {
                    "auditor_name": auditor_result.auditor_name,
                    "score": auditor_result.score,
                    "status": auditor_result.status,
                    "findings": [finding.model_dump() for finding in auditor_result.findings],
                }
            )

        return {
            "job_id": report.job_id,
            "filename": report.filename,
            "status": report.status,
            "score": report.score,
            "interpretation_label": report.interpretation_label,
            "summary": {
                "finding_count": len(report.findings),
                "auditor_count": len(findings),
            },
            "findings": findings,
        }

    def to_json(self, report: AuditReportSchema) -> str:
        return json.dumps(self.serialize(report), ensure_ascii=False, separators=(",", ":"))
