.PHONY: win dev win-front install help

# Run FastAPI Backend on Windows
win:
	@echo Starting FastAPI Backend on Windows (http://127.0.0.1:8000)...
	cd docmorph-backend && python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload

# Run FastAPI Backend on Linux / macOS
dev:
	@echo Starting FastAPI Backend on Linux / macOS (http://127.0.0.1:8000)...
	cd docmorph-backend && python3 -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload

# Run Next.js Frontend
win-front:
	@echo Starting Next.js Frontend (http://localhost:3000)...
	cd docmorph-frontend && npm run dev

# Install dependencies for both backend and frontendmake
install:
	pip install -r docmorph-backend/requirements.txt
	cd docmorph-frontend && npm install

# Help target
help:
	@echo Available commands:
	@echo   make win        - Start FastAPI backend (Windows)
	@echo   make dev        - Start FastAPI backend (Linux / macOS)
	@echo   make win-front  - Start Next.js frontend dev server
	@echo   make install    - Install all dependencies
