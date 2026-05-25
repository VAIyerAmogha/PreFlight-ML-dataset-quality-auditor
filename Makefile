.PHONY: install backend frontend test

PYTHON ?= python3
VENV ?= .venv
PIP := $(VENV)/bin/pip
PYTEST := $(VENV)/bin/python -m pytest
UVICORN := $(VENV)/bin/uvicorn

ifneq (,$(wildcard .env))
include .env
export
endif

install:
	$(PYTHON) -m venv $(VENV)
	$(PIP) install -r requirements.txt
	cd frontend && npm install

backend:
	$(UVICORN) preflight.api.main:app --app-dir src --host 127.0.0.1 --port 8000 --reload

frontend:
	cd frontend && npm run dev

test:
	$(PYTEST)
