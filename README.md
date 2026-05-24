# PreFlight

PreFlight is a local-first AI-powered dataset quality auditor. Phase 1 sets up the repository structure, local Python environment, and the shared interfaces used by all auditors.

## Repository layout

```text
PreFlight/
├── requirements.txt
├── README.md
├── src/
│   └── preflight/
│       ├── api/
│       │   └── main.py
│       ├── core/
│       │   ├── base.py
│       │   └── models.py
│       ├── ingestion/
│       │   └── dataset_ingester.py
│       └── profiling/
│           └── column_profiler.py
└── tests/
    ├── test_column_profiler.py
    └── test_dataset_ingester.py
```

## Local setup

1. Create and activate a virtual environment.

```bash
python3 -m venv .venv
source .venv/bin/activate
```

2. Install dependencies.

```bash
pip install -r requirements.txt
```

3. Run the test suite.

```bash
python -m pytest
```

4. Start the local API.

```bash
uvicorn src.preflight.api.main:app --reload
```

The app ships with a simple health endpoint for local verification.

## Notes

- Everything runs locally with Python, FastAPI, SQLite, and pytest.
- The ingestion layer is intentionally strict about file size and CSV validity so bad inputs fail fast.
- The profiling layer is independent from auditors so each auditor can be tested in isolation.
