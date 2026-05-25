from __future__ import annotations

import os
from dataclasses import dataclass

import httpx


@dataclass(slots=True)
class GroqClient:
    api_key: str | None = os.getenv("GROQ_API_KEY")
    model: str = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
    base_url: str = os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1")
    timeout_seconds: float = 10.0

    def generate(self, prompt: str) -> str:
        if not self.api_key:
            raise RuntimeError("GROQ_API_KEY is not configured")

        timeout = httpx.Timeout(
            connect=min(3.0, self.timeout_seconds),
            read=self.timeout_seconds,
            write=min(3.0, self.timeout_seconds),
            pool=min(3.0, self.timeout_seconds),
        )
        headers = {"Authorization": f"Bearer {self.api_key}"}
        payload = {
            "model": self.model,
            "temperature": 0.1,
            "messages": [
                {
                    "role": "system",
                    "content": "Return only valid JSON. Do not wrap the response in Markdown.",
                },
                {"role": "user", "content": prompt},
            ],
        }

        try:
            with httpx.Client(base_url=self.base_url, timeout=timeout, headers=headers) as client:
                response = client.post("/chat/completions", json=payload)
                response.raise_for_status()
        except (httpx.TimeoutException, httpx.TransportError, httpx.HTTPStatusError) as exc:
            raise RuntimeError("Groq request failed") from exc

        body = response.json()
        try:
            content = body["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError) as exc:
            raise RuntimeError("Unexpected Groq response") from exc
        if not isinstance(content, str):
            raise RuntimeError("Unexpected Groq response")
        return content
