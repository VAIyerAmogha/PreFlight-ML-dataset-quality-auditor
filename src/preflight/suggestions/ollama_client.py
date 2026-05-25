from __future__ import annotations

import os
from dataclasses import dataclass

import httpx


@dataclass(slots=True)
class OllamaClient:
    model: str = os.getenv("PREFLIGHT_OLLAMA_MODEL", "mistral")
    base_url: str = os.getenv("PREFLIGHT_OLLAMA_BASE_URL", "http://localhost:11434")
    timeout_seconds: float = 3.0

    def generate(self, prompt: str) -> str:
        timeout = httpx.Timeout(
            connect=min(1.0, self.timeout_seconds),
            read=self.timeout_seconds,
            write=min(1.0, self.timeout_seconds),
            pool=min(1.0, self.timeout_seconds),
        )
        try:
            with httpx.Client(base_url=self.base_url, timeout=timeout) as client:
                response = client.post(
                    "/api/generate",
                    json={"model": self.model, "prompt": prompt, "stream": False},
                )
                response.raise_for_status()
        except (httpx.TimeoutException, httpx.TransportError) as exc:
            raise RuntimeError("Ollama is unreachable") from exc

        payload = response.json()
        if not isinstance(payload, dict) or "response" not in payload:
            raise RuntimeError("Unexpected Ollama response")
        response_text = payload.get("response")
        if not isinstance(response_text, str):
            raise RuntimeError("Unexpected Ollama response")
        return response_text
