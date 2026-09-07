.PHONY: win dev run

# Run FastAPI Backend Server on Windows
win:
	@echo Starting FastAPI Backend (http://127.0.0.1:8000)...
	python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

# Run FastAPI Backend Server on Linux / macOS
dev:
	@echo Starting FastAPI Backend (http://127.0.0.1:8000)...
	python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

run: win
