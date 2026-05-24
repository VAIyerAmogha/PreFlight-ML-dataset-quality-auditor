from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Any

from preflight.suggestions.schemas import Suggestion


@dataclass(slots=True)
class SuggestionParser:
    def parse(self, text: str) -> list[Suggestion]:
        if not text or not text.strip():
            return []

        candidate_payloads = self._candidate_payloads(text)
        for candidate in candidate_payloads:
            parsed = self._parse_candidate(candidate)
            if parsed:
                return parsed
        return []

    def _candidate_payloads(self, text: str) -> list[str]:
        cleaned = text.strip()
        cleaned = self._strip_code_fences(cleaned)
        candidates = [cleaned]

        array_match = re.search(r"\[[\s\S]*\]", cleaned)
        if array_match:
            candidates.append(array_match.group(0))

        object_match = re.search(r"\{[\s\S]*\}", cleaned)
        if object_match:
            candidates.append(object_match.group(0))

        return candidates

    def _parse_candidate(self, candidate: str) -> list[Suggestion]:
        try:
            payload = json.loads(candidate)
        except json.JSONDecodeError:
            return []

        if isinstance(payload, dict):
            if "suggestions" in payload and isinstance(payload["suggestions"], list):
                payload = payload["suggestions"]
            elif self._looks_like_suggestion(payload):
                payload = [payload]
            else:
                return []

        if not isinstance(payload, list):
            return []

        suggestions: list[Suggestion] = []
        for item in payload:
            if not isinstance(item, dict):
                continue
            try:
                suggestions.append(Suggestion.model_validate(item))
            except Exception:
                continue
        return suggestions

    def _strip_code_fences(self, text: str) -> str:
        if text.startswith("```"):
            text = re.sub(r"^```(?:json)?\s*", "", text)
            text = re.sub(r"\s*```$", "", text)
        return text.strip()

    def _looks_like_suggestion(self, payload: dict[str, Any]) -> bool:
        keys = {"title", "severity", "affected_columns", "explanation", "code", "expected_impact"}
        return keys.issubset(payload.keys())
