# PreFlightML

PreFlightML is a local-first dataset quality auditor for machine learning projects. Upload a CSV, run seven data-quality auditors, review a scored report, accept suggested fixes, simulate model impact, and export a cleaned dataset bundle.

The backend is FastAPI, SQLite, pandas, scikit-learn, and LightGBM. The frontend is a Next.js dashboard that talks to the backend through local `/api/*` rewrites, so the whole demo runs on your machine with two terminal windows.

## Prerequisites

- Python 3.10+
- Node.js 18+
- npm
- Optional: Groq or Ollama for AI-generated suggestions. If no LLM is configured, PreFlightML falls back to deterministic rule-based suggestions.

## Backend Setup

From the project root:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn preflight.api.main:app --app-dir src --host 127.0.0.1 --port 8000 --reload
```

Verify the API:

```bash
curl http://localhost:8000/health
```

Expected response:

```json
{"status":"ok"}
```

## Frontend Setup

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

The frontend proxies `/api/*` to `http://localhost:8000`, so keep the backend running while using the dashboard.

## Run Tests

From the project root with the virtualenv active:

```bash
python -m pytest
```

## Make Commands

You can use `make` instead of typing the longer commands:

```bash
make install    # install Python and Node dependencies
make backend    # start FastAPI on localhost:8000
make frontend   # start Next.js on localhost:3000
make test       # run the full pytest suite
```

## One-Command Local Run

As an alternative to Make, this starts backend and frontend together:

```bash
./run.sh
```

Stop both processes with `Ctrl+C`.

## Optional LLM Setup

### Groq

Create a local `.env` file and add your key:

```bash
cp .env.example .env
```

```env
PREFLIGHT_LLM_PROVIDER=groq
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.1-8b-instant
```

Load the variables before starting the backend:

```bash
set -a
source .env
set +a
make backend
```

### Ollama

Install and start Ollama, then pull a local model:

```bash
ollama pull mistral
ollama serve
```

PreFlightML uses `mistral` by default for Ollama. Set `PREFLIGHT_OLLAMA_MODEL` if you want to use a different local model. If the configured LLM is unavailable, suggestions still work through the built-in fallback engine.

## Configuration

Copy `.env.example` if you want to document or export local settings:

```bash
cp .env.example .env
```

Supported values:

- `PREFLIGHT_UPLOAD_DIR`: where uploaded CSVs are stored.
- `PREFLIGHT_DB_PATH`: SQLite database path.
- `PREFLIGHT_MAX_FILE_SIZE_MB`: maximum CSV upload size.
- `PREFLIGHT_LLM_PROVIDER`: `auto`, `groq`, `ollama`, or `none`.
- `GROQ_API_KEY`: Groq API key for hosted suggestions.
- `GROQ_MODEL`: Groq model name.
- `GROQ_BASE_URL`: Groq OpenAI-compatible API base URL.
- `PREFLIGHT_OLLAMA_MODEL`: local Ollama model name.
- `PREFLIGHT_OLLAMA_BASE_URL`: Ollama server URL.

## Demo Flow

1. Start the backend: `make backend`
2. Start the frontend: `make frontend`
3. Open `http://localhost:3000`
4. Upload a CSV such as Iris or Titanic.
5. Wait for the audit to complete.
6. Review the report score and findings.
7. Review suggestions, accept or reject fixes, and export the cleaned bundle.
8. Export the ZIP bundle containing:
   - `cleaned_dataset.csv`
   - `preprocessing_pipeline.py`
   - `audit_report.json`

## Notes

- `src/preflight/auditors/column_health.py` is a legacy prototype auditor kept for reference and is not used by the production `JobRunner`.
- Runtime data is written to `data/` and `uploads/` by default.
- No Docker is required.
