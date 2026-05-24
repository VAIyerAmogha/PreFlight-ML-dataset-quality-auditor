from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

import pandas as pd

from preflight.core.models import AuditResult


class BaseAuditor(ABC):
    name: str

    @abstractmethod
    def run(self, df: pd.DataFrame, config: dict[str, Any]) -> AuditResult:
        raise NotImplementedError
