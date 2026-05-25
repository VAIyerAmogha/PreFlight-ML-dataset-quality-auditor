#!/usr/bin/env sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    kill "$BACKEND_PID"
  fi
  if [ -n "$FRONTEND_PID" ] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
    kill "$FRONTEND_PID"
  fi
}

trap cleanup INT TERM EXIT

if [ ! -x "$ROOT_DIR/.venv/bin/uvicorn" ]; then
  echo "Missing .venv dependencies. Run: make install"
  exit 1
fi

if [ ! -d "$ROOT_DIR/frontend/node_modules" ]; then
  echo "Missing frontend dependencies. Run: make install"
  exit 1
fi

cd "$ROOT_DIR"
.venv/bin/uvicorn preflight.api.main:app --app-dir src --host 127.0.0.1 --port 8000 --reload &
BACKEND_PID=$!

cd "$ROOT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!

echo "Backend:  http://localhost:8000"
echo "Frontend: http://localhost:3000"
echo "Press Ctrl+C to stop both."

wait "$BACKEND_PID" "$FRONTEND_PID"
