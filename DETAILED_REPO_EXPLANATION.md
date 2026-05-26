# PreFlightML — Detailed repository walkthrough

This document provides a deep, per-file and per-folder explanation of the PreFlightML repository. It covers the purpose, key functions, control flow, and implementation notes for files and folders present in the workspace as of May 26, 2026.

Table of contents
- Overview
- Top-level files
- Frontend (frontend/)
- Backend (src/preflight/)
  - API (api/)
  - Storage (storage/)
  - Execution (execution/)
  - Ingestion (ingestion/)
  - Core (core/)
  - Auditors (auditors/)
  - Suggestions (suggestions/)
  - Export (export/)
  - Reporting & scoring (reporting/, scoring/)
- Tests
- Data & uploads
- Technologies and dependencies
- Runtime flow (end-to-end)
- Security considerations and notes
- Next steps / suggestions

---

## Overview

PreFlightML is a local-first dataset quality auditing tool. The stack is a Python FastAPI backend that runs dataset auditors, produces a scored audit report, and returns suggestions (via an LLM or deterministic fallback). The frontend is a Next.js React dashboard used to upload CSVs, inspect progress and reports, accept suggestions, and export a cleaned dataset bundle.

This walkthrough documents the code layout and the purpose of each major file, along with a deeper look at the implementation details of the main modules.

---

## Top-level files

- `Makefile`
  - Purpose: developer convenience for installing deps and running backend/frontend/tests.
  - Key targets:
    - `install`: creates a Python venv (`.venv`), installs Python `requirements.txt`, and runs `npm install` inside `frontend/`.
    - `backend`: runs `uvicorn preflight.api.main:app --app-dir src` to start the FastAPI app.
    - `frontend`: runs `npm run dev` in `frontend/`.
    - `test`: runs pytest inside the venv.
  - Integration: loads a local `.env` if present and exports variables to the Makefile environment, so the `Makefile` honors `.env` settings.

- `pyproject.toml`
  - Purpose: build system metadata and pytest configuration.
  - Key lines: `[tool.pytest.ini_options]` sets `pythonpath = ["src"]` so tests can import the `src` package directly.

- `requirements.txt`
  - Contains pinned dependencies for the backend and testing: `fastapi`, `uvicorn[standard]`, `pandas`, `httpx`, `scikit-learn`, `lightgbm`, `charset-normalizer`, `python-multipart`, `pytest`, and `scipy`.

- `README.md`
  - Project overview, developer/run instructions, optional LLM setup instructions (Groq / Ollama), export format details.
  - Includes commands for local run and brief notes on fallback behavior when LLMs aren't configured.

- `run.sh`
  - A convenience shell script to start backend and frontend together.
  - Validates `.venv/bin/uvicorn` and `frontend/node_modules` exist, spawns both processes, and traps `INT/TERM` to shut them down.

- `.gitignore`
  - Standard ignores for Python, Node, and runtime data folders `data/`, `uploads/`, and `exports/`.

---

## Frontend (`frontend/`)

Purpose: a small Next.js app that provides the UI for uploads, progress, reports, and export. It is intentionally lightweight and client-first.

Key files and their responsibilities:

- `package.json`
  - Declares dependencies and scripts. Notable packages:
    - `next` 14.x: Next.js framework.
    - `react` 18.x and `react-dom`.
    - `recharts`: charting library used by some components.
    - `lucide-react`: icon set.
  - Scripts: `dev`, `build`, `start`, `lint`.

- `next.config.js`
  - Contains a `rewrites()` configuration mapping `/api/:path*` to `http://localhost:8000/:path*`. This makes the frontend request `/api/*` without worrying about CORS in dev by proxying to the backend.

- `tailwind.config.js` and `postcss.config.js`
  - Tailwind configuration for utility CSS; content globs include `./app/**/*`, `./components/**/*`, and `./lib/**/*`.

- `app/layout.jsx` and `app/globals.css`
  - Global page layout and Tailwind/global CSS.

- `app/page.jsx` (upload & dashboard)
  - The main Upload page. Key client behavior:
    - Reads CSV headers from the first line of the file slice (the first 64KiB) to populate target/protected fields before upload.
    - Validates file extension is `.csv`.
    - Calls `uploadDataset` (frontend `lib/api.js`) to POST the file to `/upload`.
    - On success, saves basic job context in local storage and navigates to the progress view.
  - UI details: Workflow header, dashboard cards, drag-and-drop upload area, target/protected selector, and quick links to the latest saved report.

- `components/WorkflowHeader.jsx`
  - A reusable header with step indicators and small navigation (Home, Upload). Accepts `title`, `steps`, `activeStep`, and optional `jobId` props.

- `components/*` (charts, badges, tables, suggestion cards)
  - Visual components used in the report and audit pages. They use `recharts` for graphs and `lucide-react` icons. Components are primarily presentational and rely on props-only inputs; code is straightforward React functional components.

- `lib/api.js`
  - Frontend helper that performs fetch/http requests against `/api/*`.
  - Typical functions (names from the repo): `uploadDataset`, `loadLatestReport`, `saveJobContext`, and wrappers for `GET /jobs/:id`, `GET /jobs/:id/report`, `GET /jobs/:id/suggestions`, and the export endpoint.
  - Important: the frontend expects the backend to be accessible via the Next.js proxy defined in `next.config.js`.

Notes about the frontend runtime:
- The frontend performs only optimistic UI / polling. It does not run heavy computation or model training; all computational work is in the backend.
- The UI is intentionally minimal and focused on guiding the user through upload → audit → review → export.

---

## Backend (`src/preflight/`)

Top-level layout and responsibilities:
- `api/` — API entrypoint and request/response schemas used by the FastAPI app.
- `auditors/` — implementations of dataset auditors (MissingData, Duplicates, ClassImbalance, DataLeakage, LabelNoise, Outliers, Bias, plus a legacy `column_health.py`).
- `core/` — base auditor interface and shared data models.
- `execution/` — job orchestration (`JobRunner`, `PipelineRunner`).
- `ingestion/` — `DatasetIngester` for robust CSV ingestion.
- `reporting/` + `scoring/` — Pydantic schemas and scoring logic.
- `storage/` — SQLite helpers and `JobStore` for persistence.
- `suggestions/` — LLM clients, parser, fallback engine, and suggestion validation.
- `export/` — apply accepted suggestions to a DataFrame and build a ZIP export bundle.

Below we dive into the most important files and explain their inner workings.

### API

- `src/preflight/api/main.py`
  - This is the FastAPI app factory and entrypoint. Key responsibilities and code paths:
    - `create_app(...)` constructs services: `JobStore`, `JobRunner`, `SuggestionEngine`, `PreprocessingApplicator`, `ExportBuilder`, and ensures `upload_dir` exists.
    - Lifespan manager: on shutdown, `runner.shutdown()` is invoked to stop pending threads cleanly.
    - Middleware: CORS is enabled for all origins (development convenience), and a global `error_handling_middleware` catches unexpected exceptions and returns a 500 response while logging details.
    - Exception handlers: custom handlers for `JobNotFoundError` (404) and `DatasetIngestError` (400) so the API surfaces meaningful errors to clients.

  - Endpoints (brief):
    - `GET /health` — simple health check returning `{status: 'ok'}`.
    - `POST /upload` — core upload flow:
      - Validates filename and suffix `.csv`.
      - Generates `job_id` (UUID hex), writes the upload to `uploads/{job_id}.csv` via `_save_upload`.
      - Creates job record in the `JobStore` with `auditor_total = len(runner.auditors)`.
      - Calls `DatasetIngester.ingest()` in a thread pool to validate CSV; on ingest error, the job is marked failed and a 400 is returned.
      - Submits the job to `runner.submit_job(job_id, path)` and returns `UploadResponseSchema` with `status: 'PENDING'`.
    - `GET /jobs/{job_id}` — returns job state via `JobStore.get_job_status()`.
    - `GET /jobs/{job_id}/report` — returns the aggregated `AuditReportSchema` (must be COMPLETED; otherwise 202).
    - `GET /jobs/{job_id}/suggestions` — uses `SuggestionEngine.generate(report)` to return suggestions (LLM or fallback), executed in a threadpool.
    - `POST /jobs/{job_id}/export` — applies accepted suggestions and returns a ZIP file response:
      - Validates report ready
      - Re-ingests the original CSV with `DatasetIngester` to produce `source_df` (ensures consistent application)
      - Generates suggestions and filters accepted ones
      - Applies suggestions with `PreprocessingApplicator.apply` (off-thread)
      - Ensures the `target_column` is present in the transformed df (append if needed)
      - Builds export bundle with `ExportBuilder.build()` and returns it as a `FileResponse` while scheduling cleanup of the temp dir via `BackgroundTask`.

  - Helper functions in `main.py`:
    - `_cleanup_export_dir(path)` — deletes files and directories created for export.
    - `_completed_report_or_202(store, job_id)` — helper to fetch a report and raise a 202 if not ready.
    - `_accepted_suggestions(suggestions, accepted_ids)` — filters suggestion objects by ID.
    - `_pick_target_column(dataframe)` and `_ensure_target_column(...)` — used to infer or verify the target column during export.

### Storage and database

- `src/preflight/storage/database.py` (helper module)
  - Exposes `connect(path)` which returns a DB connection (wrapped to return rows by name). Also runs `initialize_database(path)` to create `jobs` and `audit_results` tables if missing.

- `src/preflight/storage/job_store.py`
  - `JobStore` is a thin persistence layer around SQLite. Important implementation details:
    - Uses dataclasses `JobRecord` and `AuditorRecord` to represent DB rows.
    - `create_job(job_id, filename, stored_path, auditor_total)` inserts a new row into `jobs` with `status='PENDING'`.
    - `get_job(job_id)` and `get_job_status(job_id)` fetch job rows and convert them to schema instances used by the API.
    - `record_auditor_running(...)` and `record_auditor_result(...)` call `upsert_auditor_result(...)`, which inserts or updates rows in `audit_results` using `ON CONFLICT(job_id, auditor_name) DO UPDATE` semantics.
    - `build_report(job_id)` collects `audit_results` rows, deserializes findings (JSON) into `FindingSchema` objects, collates them into `AuditResult` dataclasses, and then runs `ScoringEngine.score(results)` to compute the final score breakdown. The method returns `AuditReportSchema` ready to be serialized for API responses or storage.
    - `save_completed_report(report)` serializes the Pydantic `AuditReportSchema` JSON to `jobs.report_json` and marks the job `report_ready=1`.
    - Private helpers ensure job progress and auditor progress values are kept in sync (`_refresh_job_auditor_progress`).

  - Notes: Storing findings as JSON strings keeps the DB schema simple and allows the code to evolve the `FindingSchema` without a complicated relational design.

### Execution and orchestration

- `src/preflight/execution/job_runner.py`
  - `JobRunner` manages a `ThreadPoolExecutor` for background jobs. Key points:
    - Default `auditors` list includes the core auditors in a deliberate, fixed order.
    - `submit_job(job_id, file_path)` schedules `_run_job` on the executor.
    - `_run_job` marks the job running, ingests the CSV via a fresh `DatasetIngester`, constructs a default config (target column and protected attributes) and then passes work to `PipelineRunner.run()` for auditor orchestration.
    - `_pick_target_column` and `_pick_protected_attributes` use heuristics: common target column names, tokens for protected columns (`gender`, `sex`, `race`, `age_group`) or fallback to the first categorical column.

- `src/preflight/execution/pipeline_runner.py`
  - Orchestrates running multiple auditors for a job in parallel and collects results.
  - For each auditor:
    - Calls `job_store.record_auditor_running(job_id, auditor.name)` to mark progress.
    - Runs the auditor `run(df, config)` and measures execution time.
    - Calls `job_store.record_auditor_result(...)` to persist findings and computed score per auditor.
  - After all auditors complete, calls `job_store.complete_job(job_id)` to aggregate and persist the final report.

### Ingestion

- `src/preflight/ingestion/dataset_ingester.py`
  - Robust CSV ingestion responsibilities:
    - Validates the path exists, is a file, and has `.csv` suffix.
    - Enforces maximum file size (default 25 MB) and maximum rows (`max_rows`, default 1_000_000).
    - Uses `charset_normalizer.from_path(path).best()` to detect file encoding, falling back to `utf-8` when uncertain.
    - Uses `pandas.read_csv(path, encoding=encoding, **read_csv_kwargs)` to read the CSV into a DataFrame.
    - Validates the resulting DataFrame is not empty and has at least one column.
  - On failure, raises `DatasetIngestError`, which the API maps to a 400 response and marks jobs failed when appropriate.

### Core abstractions

- `src/preflight/core/base.py`
  - Defines `BaseAuditor` abstract interface requiring `.run(df, config) -> AuditResult`.

- `src/preflight/core/models.py`
  - Dataclasses for `Finding`, `AuditResult`, and `ColumnProfile` used by auditors and the store.

### Auditors (`src/preflight/auditors/`)

Each auditor implements `BaseAuditor.run()` and returns an `AuditResult` containing a numeric score, findings (list of `Finding` items), execution time, and status string. Below are concise descriptions with implementation notes.

- `missing_data.py`
  - Detects columns with nulls, percent null, long-tail missing patterns, and suggests imputation strategies. Implementation details:
    - Computes null counts and percentages using `df.isna()`.
    - Uses dtype checks to separate numeric vs categorical imputation strategies.
    - Produces `Finding` entries with `issue_type='missing_data'` and severity based on thresholds.

- `duplicates.py`
  - Finds exact duplicate rows and may detect near-duplicates.
  - Uses `df.duplicated()` and returns findings referencing affected row counts and columns.

- `class_imbalance.py`
  - Analyzes the distribution of the inferred target column.
  - Produces a severity score when minority/majority split exceeds thresholds and provides metadata used by fallback SMOTE suggestion generator.

- `data_leakage.py`
  - Heuristics to detect leaking features (features extremely correlated with the target or containing target-derived tokens in the header name).
  - Uses simple statistical correlation measures for numeric columns, and value-based checks for categorical features.

- `label_noise.py`
  - Attempts to identify suspiciously labeled rows.
  - If `cleanlab` is available, uses it; otherwise falls back to centroid-based heuristics comparing feature centroids per class.

- `outliers.py`
  - Numeric outlier detection using IQR and z-score approaches.
  - Reports affected columns and example statistics, such as quantiles.

- `bias.py`
  - Checks protected subgroup parity for specified `protected_attributes` in the config.
  - Computes group-wise distributions and disparity metrics.

- `column_health.py`
  - Legacy prototype (kept for reference). README notes it is not used by the production `JobRunner`.

All auditors return a score where higher is better (or a normalized value) and, importantly, list `Finding` objects that become the primary payload for suggestion generation.

### Suggestions and LLM integration (`src/preflight/suggestions/`)

- `suggestion_engine.py`
  - Orchestrates generation of suggestions for a completed `AuditReportSchema`.
  - Steps:
    1. Serializes the `AuditReportSchema` using `FindingsSerializer` to a compact payload.
    2. Builds a standardized prompt requiring an array of suggestions in JSON with keys `title`, `severity`, `affected_columns`, `explanation`, `code`, `expected_impact`.
    3. Tries configured LLM providers based on `PREFLIGHT_LLM_PROVIDER` environment variable (`groq`, `ollama`, `auto`, `none`, or `fallback`).
    4. Parses raw LLM text via `SuggestionParser`.
    5. If LLM returns nothing or parsing fails, falls back to `RuleBasedFallbackEngine`.
    6. Filters suggestions via `CodeValidator.filter_valid()` to ensure the code is plausible and the suggestion references allowed columns before being presented or applied.
    7. Assigns stable IDs to suggestions (`suggestion_{index}`) if missing.

- `groq_client.py` and `ollama_client.py`
  - Thin HTTP clients using `httpx`.
  - `GroqClient` posts to a configurable `GROQ_BASE_URL` `/chat/completions` endpoint using `GROQ_API_KEY` and expects OpenAI-style response structure.
  - `OllamaClient` posts to `PREFLIGHT_OLLAMA_BASE_URL/api/generate` and expects a JSON dict with a `response` string.
  - Both clients enforce timeouts and raise `RuntimeError` on unexpected responses.

- `fallback_engine.py` (Rule-based fallback)
  - Generates deterministic, executable Python code snippets tailored to findings:
    - Missing values: fill numeric columns with median and category columns with mode.
    - Duplicates: `df.drop_duplicates()` snippet.
    - Class imbalance: SMOTE attempt with an imblearn fallback or simple oversampling with sampling and `pd.concat`.
    - Leakage: `df.drop(columns=...)` snippet.
    - Outliers: IQR-based winsorization / clipping snippet.
    - Label noise: tries `cleanlab` first, otherwise centroid-based label filtering.
  - Each returned `Suggestion` includes `title`, `severity`, `affected_columns`, `explanation`, `code`, `expected_impact`.

- `findings_serializer.py`, `suggestion_parser.py`, and `code_validator.py`
  - These utilities serialize the report for prompt payload, parse raw LLM responses into `Suggestion` models (handling variations/formatting), and validate code snippets so they are syntactically plausible and reference allowed columns before being presented or applied.

### Export and preprocessing

- `src/preflight/export/preprocessing_applicator.py`
  - Applies a list of accepted `Suggestion` objects to a DataFrame.
  - Execution model:
    - For each suggestion, tries to `exec` the suggestion code in a constrained local namespace, where `df` is available as the DataFrame variable.
    - Records `ApplicatorStepLog` entries capturing `suggestion_id`, `title`, whether the step applied (`applied` boolean), and `error` text if it failed.
    - Returns the transformed DataFrame and the list of logs.
  - Notes: executing arbitrary code produced by an LLM is risky; the implementation includes validation steps but does not provide a fully secure sandbox.

- `src/preflight/export/export_builder.py`
  - Writes the cleaned CSV, a `preprocessing_pipeline.py` script that replays accepted suggestion code sequentially (helps reproducibility), and the `audit_report.json` with `accepted_suggestion_ids` and `application_logs`.
  - Packs these files into `preflight_export_bundle.zip` and returns the path. The API serves the ZIP with `FileResponse` and schedules temporary directory cleanup.

### Reporting & scoring

- `src/preflight/reporting/schemas.py`
  - Pydantic models for all API response payloads:
    - `UploadResponseSchema`, `JobStatusSchema`, `AuditReportSchema`, `FindingSchema`, `AuditorResultSchema`, `ScoreBreakdownSchema`, etc.
  - These models are used in FastAPI `response_model` decorators to validate and document API responses.

- `src/preflight/scoring/scoring_engine.py`
  - Accepts a list of `AuditResult` entries and computes a weighted score summary with a final `final_score` and `interpretation_label`.
  - Produces `ScoreBreakdownSchema` items used in the final report.

### Profiling

- `src/preflight/profiling/column_profiler.py`
  - Computes per-column statistics: dtype, null counts/pct, unique counts, sample values, and basic numeric summary stats. Used to enrich findings and aid suggestion generation.

### Simulation (optional)

- `src/preflight/simulation/` contains `simulation_engine.py` and schemas for running a simple model simulation (train/test) to estimate suggestion impact; not all demos use this by default.

---

## Tests (`tests/`)

- The test suite exercises ingestion, auditors, pipeline orchestration, suggestion generation, and export builder.
- Representative tests:
  - `tests/test_dataset_ingester.py` — validates CSV ingestion behavior and `DatasetIngestError` paths.
  - `tests/test_pipeline_runner.py` — runs a small pipeline end-to-end with sample data and asserts `JobStore` state transitions.
  - `tests/test_auditors/*` — per-auditor unit tests checking findings and severity thresholds.
  - `tests/test_suggestions/*` — tests suggestion parsing, fallback generation, and validator behavior.

Notes: The test suite assumes `src` is on `PYTHONPATH` (configured in `pyproject.toml`) and uses pytest markers for small unit tests.

---

## Data & uploads

- `data/` (ignored) — default SQLite path `data/preflight.sqlite3` (created at runtime by `initialize_database`), used to persist jobs and results.
- `uploads/` (ignored) — uploaded CSVs are saved as `{job_id}.csv` and later re-ingested when building exports. A few sample CSVs are included in the repo for quick demos.

---

## Technologies and dependencies (why each is present)

- FastAPI — async web framework for the backend API; simple integration with Pydantic for schema validation.
- Uvicorn — ASGI server recommended for FastAPI.
- pandas — primary tabular data library used to read/transform CSVs.
- scikit-learn — utilities used by some auditors (e.g., centroid calculations) and model-related helpers.
- LightGBM — an optional fast gradient boosting library (used in simulation/scoring or optional model steps).
- httpx — lightweight HTTP client for LLM integrations (Groq API and Ollama local server).
- charset-normalizer — robust detection of file encodings for uploaded CSVs.
- imbalanced-learn (optional) — used by fallback SMOTE code if installed.
- cleanlab (optional) — optional dependency for label noise detection in `label_noise.py` fallback.
- Next.js (frontend) — React framework used for the UI; dev server at `:3000` with rewrites to the backend.
- Tailwind CSS, PostCSS — styling utilities and processor for the frontend.
- Recharts & lucide-react — charts and icons.
- pytest — test runner.

---

## Runtime flow (step-by-step)

1. Frontend user picks a CSV (drag/drop or file dialog) on `app/page.jsx`. The client reads the first 64 KiB to extract the header row.
2. The client posts the uploaded file to `POST /upload` (proxy to backend) using `lib/api.js`. The server writes the file to `uploads/{job_id}.csv`.
3. The backend `JobStore.create_job()` records the job with status `PENDING` and auditor count.
4. `JobRunner.submit_job()` schedules the job on a thread pool; ingestion and default config inference happen inside the worker.
5. `PipelineRunner` launches auditors (parallelized per auditor) and each auditor returns an `AuditResult` and a list of `Finding` items.
6. `JobStore.build_report()` aggregates auditor outputs, runs `ScoringEngine`, and stores the final JSON report and `score` in `jobs.report_json`.
7. The frontend polls `GET /jobs/{job_id}` and, once ready, fetches `GET /jobs/{job_id}/report` and `GET /jobs/{job_id}/suggestions`.
8. `SuggestionEngine` builds a prompt from the findings, tries LLM providers (Groq/Ollama) to get code suggestions. If LLMs are not available or parsing fails, the deterministic fallback generates executable suggestions.
9. The user selects suggestions to accept and posts them to `POST /jobs/{job_id}/export`. The server re-ingests the original CSV, applies `PreprocessingApplicator.apply` to transform the DataFrame, and `ExportBuilder.build()` writes the cleaned CSV, pipeline script, and report JSON into a ZIP returned to the user.

---

## Security, risks, and mitigations

- Executing arbitrary code from LLM outputs is inherently risky. The repository mitigates this partially by:
  - Using `CodeValidator` to filter suggestions.
  - Running LLM code application in controlled sequences with application logs and returning results for user review.
- However, `exec`ing arbitrary code can access filesystem, network, or environment variables. For production usage consider:
  - Running code application in a strict sandboxed environment (separate container, limited filesystem, seccomp, or `subprocess` with restricted capabilities).
  - Avoid directly executing LLM code — instead convert suggestions to parameterized, pre-approved transformations implemented by the app.
  - Require human review for any suggestion that contains non-whitelisted imports, filesystem access, or `os`/`sys` calls.

---

## Next steps I can take (choose any)

- Run the test suite here and report failures: `python -m pytest`.
- Generate a per-line annotated copy of any specific file (e.g., `main.py`, `job_store.py`, or a specific auditor).
- Add unit tests for suggestion parsing or code-validator edge cases.
- Add a safety wrapper to `PreprocessingApplicator` so suggestions are applied inside a minimal sandbox (example: subprocess execution with temporary CSV input and strict timeouts).

---

If you want a deeper line-by-line annotation for any single file, tell me which file(s) to annotate next and I will append thorough inline explanations to this document.
