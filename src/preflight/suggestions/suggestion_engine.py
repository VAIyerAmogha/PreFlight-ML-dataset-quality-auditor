from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import Any

from preflight.reporting.schemas import AuditReportSchema
from preflight.suggestions.code_validator import CodeValidator
from preflight.suggestions.fallback_engine import RuleBasedFallbackEngine
from preflight.suggestions.findings_serializer import FindingsSerializer
from preflight.suggestions.groq_client import GroqClient
from preflight.suggestions.ollama_client import OllamaClient
from preflight.suggestions.schemas import Suggestion
from preflight.suggestions.suggestion_parser import SuggestionParser


@dataclass(slots=True)
class SuggestionEngine:
    serializer: FindingsSerializer = field(default_factory=FindingsSerializer)
    groq_client: GroqClient = field(default_factory=GroqClient)
    ollama_client: OllamaClient = field(default_factory=OllamaClient)
    parser: SuggestionParser = field(default_factory=SuggestionParser)
    fallback_engine: RuleBasedFallbackEngine = field(default_factory=RuleBasedFallbackEngine)
    validator: CodeValidator = field(default_factory=CodeValidator)
    provider: str = field(default_factory=lambda: os.getenv("PREFLIGHT_LLM_PROVIDER", "auto").lower())

    def generate(self, report: AuditReportSchema) -> list[Suggestion]:
        payload = self.serializer.serialize(report)
        prompt = self._build_prompt(payload)
        suggestions = self._try_llm(prompt)
        if not suggestions:
            suggestions = self.fallback_engine.generate(report)
        valid_suggestions = self.validator.filter_valid(suggestions, self._suggestion_columns(report))
        if valid_suggestions:
            return self._assign_ids(valid_suggestions)

        fallback_valid = self.validator.filter_valid(self.fallback_engine.generate(report), self._suggestion_columns(report))
        return self._assign_ids(fallback_valid)

    def _try_llm(self, prompt: str) -> list[Suggestion]:
        providers = {
            "groq": [self.groq_client],
            "ollama": [self.ollama_client],
            "auto": [self.groq_client, self.ollama_client],
            "none": [],
            "fallback": [],
        }.get(self.provider, [self.groq_client, self.ollama_client])

        for client in providers:
            parsed = self._try_client(client, prompt)
            if parsed:
                return parsed
        return []

    def _try_client(self, client: GroqClient | OllamaClient, prompt: str) -> list[Suggestion]:
        try:
            raw = client.generate(prompt)
        except Exception:
            return []

        return self.parser.parse(raw)

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
