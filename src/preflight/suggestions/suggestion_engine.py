from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from preflight.reporting.schemas import AuditReportSchema
from preflight.suggestions.code_validator import CodeValidator
from preflight.suggestions.fallback_engine import RuleBasedFallbackEngine
from preflight.suggestions.findings_serializer import FindingsSerializer
from preflight.suggestions.ollama_client import OllamaClient
from preflight.suggestions.schemas import Suggestion
from preflight.suggestions.suggestion_parser import SuggestionParser


@dataclass(slots=True)
class SuggestionEngine:
    serializer: FindingsSerializer = field(default_factory=FindingsSerializer)
    ollama_client: OllamaClient = field(default_factory=OllamaClient)
    parser: SuggestionParser = field(default_factory=SuggestionParser)
    fallback_engine: RuleBasedFallbackEngine = field(default_factory=RuleBasedFallbackEngine)
    validator: CodeValidator = field(default_factory=CodeValidator)

    def generate(self, report: AuditReportSchema) -> list[Suggestion]:
        payload = self.serializer.serialize(report)
        prompt = self._build_prompt(payload)
        suggestions = self._try_ollama(prompt, report)
        if not suggestions:
            suggestions = self.fallback_engine.generate(report)
        valid_suggestions = self.validator.filter_valid(suggestions, self._suggestion_columns(report))
        if valid_suggestions:
            return self._assign_ids(valid_suggestions)

        fallback_valid = self.validator.filter_valid(self.fallback_engine.generate(report), self._suggestion_columns(report))
        return self._assign_ids(fallback_valid)

    def _try_ollama(self, prompt: str, report: AuditReportSchema) -> list[Suggestion]:
        try:
            raw = self.ollama_client.generate(prompt)
        except Exception:
            return []

        parsed = self.parser.parse(raw)
        if not parsed:
            return []
        return parsed

    def _build_prompt(self, payload: dict[str, Any]) -> str:
        return (
            "You are an ML data quality assistant. "
            "Return a JSON array of suggestions with keys title, severity, affected_columns, explanation, code, expected_impact. "
            "Use only executable Python code.\n\n"
            f"Audit payload:\n{payload}"
        )

    def _suggestion_columns(self, report: AuditReportSchema) -> list[str]:
        columns: list[str] = []
        for finding in report.findings:
            columns.extend(finding.affected_columns)
        return list(dict.fromkeys(columns))

    def _assign_ids(self, suggestions: list[Suggestion]) -> list[Suggestion]:
        assigned: list[Suggestion] = []
        for index, suggestion in enumerate(suggestions, start=1):
            payload = suggestion.model_dump()
            payload["id"] = payload.get("id") or f"suggestion_{index}"
            assigned.append(Suggestion.model_validate(payload))
        return assigned
