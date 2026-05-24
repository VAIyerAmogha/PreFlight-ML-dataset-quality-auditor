from __future__ import annotations

import time
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from preflight.core.base import BaseAuditor
from preflight.ingestion.dataset_ingester import DatasetIngestError, DatasetIngester
from preflight.auditors.bias import BiasAuditor
from preflight.auditors.class_imbalance import ClassImbalanceAuditor
from preflight.auditors.data_leakage import DataLeakageAuditor
from preflight.auditors.duplicates import DuplicatesAuditor
from preflight.auditors.label_noise import LabelNoiseAuditor
from preflight.auditors.missing_data import MissingDataAuditor
from preflight.auditors.outliers import OutliersAuditor
from preflight.execution.pipeline_runner import PipelineRunner
from preflight.storage.job_store import JobStore


@dataclass(slots=True)
class JobRunner:
    job_store: JobStore
    auditors: list[BaseAuditor] = field(
        default_factory=lambda: [
            MissingDataAuditor(),
            DuplicatesAuditor(),
            ClassImbalanceAuditor(),
            DataLeakageAuditor(),
            LabelNoiseAuditor(),
            OutliersAuditor(),
            BiasAuditor(),
        ]
    )
    max_workers: int = 2
    _executor: ThreadPoolExecutor = field(init=False, repr=False)
    pipeline_runner: PipelineRunner = field(init=False, repr=False)

    def __post_init__(self) -> None:
        self._executor = ThreadPoolExecutor(max_workers=self.max_workers)
        self.pipeline_runner = PipelineRunner(job_store=self.job_store, auditors=self.auditors, max_workers=len(self.auditors))

    def submit_job(self, job_id: str, file_path: str | Path) -> None:
        self._executor.submit(self._run_job, job_id, Path(file_path))

    def shutdown(self) -> None:
        self._executor.shutdown(wait=False, cancel_futures=True)

    def _run_job(self, job_id: str, file_path: Path) -> None:
        try:
            self.job_store.mark_job_running(job_id)
            ingester = DatasetIngester()
            dataframe = ingester.ingest(file_path)
            config = self._build_default_config(dataframe)
            self.pipeline_runner.run(job_id, dataframe, config)
        except DatasetIngestError as exc:
            self.job_store.mark_job_failed(job_id, str(exc))
        except Exception as exc:  # noqa: BLE001
            self.job_store.mark_job_failed(job_id, f"{type(exc).__name__}: {exc}")

    def _build_default_config(self, dataframe) -> dict[str, Any]:
        target_column = self._pick_target_column(dataframe)
        protected_attributes = self._pick_protected_attributes(dataframe, target_column)
        config: dict[str, Any] = {"target_column": target_column}
        if protected_attributes:
            config["protected_attributes"] = protected_attributes
        return config

    def _pick_target_column(self, dataframe) -> str:
        preferred = ["target", "label", "class", "outcome", "y"]
        lower_to_column = {column.lower(): column for column in dataframe.columns}
        for candidate in preferred:
            if candidate in lower_to_column:
                return lower_to_column[candidate]
        return dataframe.columns[0]

    def _pick_protected_attributes(self, dataframe, target_column: str) -> list[str]:
        protected_tokens = ["protected", "gender", "sex", "race", "ethnicity", "age_group"]
        protected: list[str] = []
        for column in dataframe.columns:
            if column == target_column:
                continue
            lowered = column.lower()
            if any(token in lowered for token in protected_tokens):
                protected.append(column)
        if protected:
            return protected

        categorical_columns = [
            column
            for column in dataframe.columns
            if column != target_column and dataframe[column].dtype == "object"
        ]
        return categorical_columns[:1]
