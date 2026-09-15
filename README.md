# DocMorph — ZIP Document Processor & Pipeline

A full-stack, enterprise document processing system built with **FastAPI (Python)**, **Next.js 16 (React / TypeScript / Tailwind CSS)**, and **MongoDB**.

---

## 📋 Table of Contents
- [✨ Key Features](#-key-features)
- [💻 Frontend Setup & Run](#-frontend-setup-and-run)
- [🐍 Backend Setup & Run](#-backend-setup-and-run)
- [🔄 7-Step Workflow Overview](#-7-step-workflow-overview)
- [📁 Project Directory Structure](#-project-directory-structure)
- [🗂️ Output Folder Structure](#-output-folder-structure)
- [🔌 API Endpoints Reference](#-api-endpoints-reference)

---

## ✨ Key Features

1. **Multi-Format Archive Support (Feature 1)**:
   - Full support for `.zip`, `.rar`, `.7z`, `.tar`, `.tgz`, `.tar.gz`, and `.tar.xz` archives up to 200MB.
2. **Universal File Format Support & Organization (Feature 2)**:
   - Preserves all archive contents without data loss.
   - Automatically organizes non-document files into structured subfolders under `Other/` (`Images/`, `Spreadsheets/`, `Presentations/`, `Media/`, `Text_Data/`, `General/`).
3. **Multiple Archive Upload & Batch Processing (Feature 3)**:
   - Upload and process multiple archives in a single batch.
   - Choose between **Same Parent Folder** or **Different Parent Folders** (per-archive mapping).
   - Sequential processing queue with per-job failure isolation.
4. **Resume Interrupted Jobs (Feature 4)**:
   - Persistent job state in MongoDB across all workflow steps.
   - **Unfinished Jobs UI**: View, resume, or discard interrupted/saved tasks.
   - **File-Level Conversion Resume**: Inspects existing PDFs, skips valid ones, fixes corrupted/0-byte files, and converts only remaining Word documents.
   - **Atomic Extraction Resume**: Interrupted extractions cleanly re-extract from the preserved archive.
   - **Intentional Leave Guard**: 3-button modal (`Save & Exit`, `Don't Save`, `Cancel`) when leaving an active workflow.
5. **In-Browser PDF Viewer (Feature 5)**:
   - Click any generated or existing PDF filename in the Summary Report or Conversion History to view it directly inside an in-browser modal.
   - Zero external libraries required (uses browser-native rendering via Base64 streaming).
   - Strict server-side path traversal protection and validation.

---

## 💻 Frontend Setup and Run:

1. **Open the repository in your terminal**.
2. **Go to the frontend folder**:
   ```bash
   cd docmorph-frontend
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Start the development server**:
   ```bash
   npm run dev
   ```
   *Frontend will run at `http://localhost:3000`.*
5. **Production Build**:
   ```bash
   npm run build
   ```

---

## 🐍 Backend Setup and Run:

1. **Go to the backend folder**:
   ```bash
   cd docmorph-backend
   ```
2. **Create a virtual environment**:
   ```bash
   python -m venv venv
   ```
3. **Activate the environment**:
   - **PowerShell**:
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
   - **Command Prompt (CMD)**:
     ```cmd
     .\venv\Scripts\activate.bat
     ```
   - **Bash (Linux / macOS)**:
     ```bash
     source venv/bin/activate
     ```
4. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
5. **Start the FastAPI backend**:
   - **Windows**:
     ```bash
     make win
     ```
     *(or `cd docmorph-backend && python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload`)*
   - **Linux / macOS**:
     ```bash
     make dev
     ```
     *(or `cd docmorph-backend && python3 -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload`)*
   *Backend API runs at `http://127.0.0.1:8000` (Docs at `http://127.0.0.1:8000/docs`).*

---

## 🔄 7-Step Workflow Overview

```
Step 1: Upload Archive(s)  → Select single or multiple archives (.zip, .rar, .7z, .tar, .tgz, .tar.xz)
       ↓
Step 2: Target Folder      → Choose "Same Folder" or "Different Folders" per archive
       ↓
Step 3: Confirmation       → Review archives, folder mappings, and queue order
       ↓
Step 4: Extraction         → Unpacks into Word/, PDF/, and Other/ subfolders; preserves archive
       ↓
Step 5: Convert Decision   → Prompt user whether to convert Word documents (.doc / .docx) to PDF
       ↓
Step 6: Conversion         → Converts Word to PDF with live progress & file-level resume support
       ↓
Step 7: Summary & Report   → View summary, inspect files in In-Browser PDF Viewer, & download CSV
```

---

## 📁 Project Directory Structure

```
zip-document-processor/
│
├── docmorph-frontend/
│   ├── app/
│   │   ├── confirmation/    # Step 3: Batch Confirmation & Review
│   │   ├── conversion/      # Step 6: Conversion Progress
│   │   ├── decision/        # Step 5: Convert Decision
│   │   ├── extraction/      # Step 4: Extraction Progress
│   │   ├── folder/          # Step 2: Target Folder Selection (Single / Batch modes)
│   │   ├── history/         # MongoDB Conversion History Viewer
│   │   ├── summary/         # Step 7: Summary & File Processing Report
│   │   ├── upload/          # Step 1: Upload Archive(s) & Unfinished Jobs Banner
│   │   ├── layout.tsx       # Root layout & shell
│   │   └── page.tsx         # Root redirect
│   │
│   ├── components/          # UI components (PdfViewerModal, LeaveWorkflowModal, Header, etc.)
│   ├── context/             # WorkflowContext state & resume manager
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Frontend API client & shared utilities
│   ├── public/              # Static SVG and web assets
│   ├── styles/              # Global styles (globals.css)
│   ├── types/               # TypeScript interfaces & definitions
│   ├── next.config.ts       # Next.js configuration
│   ├── package.json         # Frontend dependencies & scripts
│   ├── tsconfig.json        # TypeScript configuration (root path alias @/*)
│   └── postcss.config.mjs   # Tailwind CSS PostCSS configuration
│
├── docmorph-backend/
│   ├── app/
│   │   ├── api/             # API routes (/upload, /batch, /extract, /convert, /jobs, /pdf/view)
│   │   ├── core/            # Core business logic / application core
│   │   ├── models/          # Persistent domain models (models.py)
│   │   ├── schemas/         # Pydantic request/response schemas (schemas.py)
│   │   ├── services/        # ConversionService, ZipService, DocumentService
│   │   └── utils/           # Security sanitization & logger
│   │
│   ├── config/              # Application settings & environment configuration
│   ├── repositories/        # MongoDB database repository
│   ├── scripts/             # Maintenance & execution scripts
│   ├── tests/               # Automated test suites
│   ├── main.py              # FastAPI application entry point
│   ├── requirements.txt     # Python dependencies
│   ├── .env                 # Backend environment config
│   └── .env.example         # Environment template
│
├── Output/                  # Processed job outputs (Word/, PDF/, Other/, original archives)
├── Makefile                 # Make automation targets (make win, make dev, make win-front)
└── README.md                # Project documentation & setup instructions
```

---

## 🗂️ Output Folder Structure

When an archive is processed into a folder name (e.g. `Project_Reports`), it is organized in the root `Output/` directory:

```
Output/
└── Project_Reports/
    ├── documents.zip        # Original uploaded archive (preserved)
    ├── Word/                # All original .doc and .docx files (untouched)
    │   ├── developer.docx
    │   └── analyst.doc
    ├── PDF/                 # Generated PDFs + any pre-existing PDFs
    │   ├── policy.pdf       # (Existing PDF from archive)
    │   ├── developer.pdf    # (Converted from developer.docx)
    │   └── analyst.pdf      # (Converted from analyst.doc)
    └── Other/               # All other retained file types
        ├── Images/          # (.png, .jpg, .svg, etc.)
        ├── Spreadsheets/    # (.xlsx, .csv, etc.)
        ├── Presentations/   # (.pptx, etc.)
        ├── Text_Data/       # (.txt, .json, .py, etc.)
        └── Media/           # (.mp3, .mp4, etc.)
```

---

## 🔌 API Endpoints Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/upload` | Stages single archive file (.zip, .rar, .7z, .tar, .tgz, .tar.xz). |
| `POST` | `/api/batch/upload` | Stages multiple archives with folder mode (`SAME` or `DIFFERENT`). |
| `GET` | `/api/batch/status/{batch_id}` | Returns real-time aggregate progress for a multi-archive batch. |
| `POST` | `/api/extract` | Extracts and classifies files into `Word/`, `PDF/`, and `Other/`. |
| `POST` | `/api/convert` | Converts Word files to PDF with file-level resume (skips valid PDFs). |
| `POST` | `/api/finish-without-conversion` | Finalizes job when user chooses to skip conversion. |
| `GET` | `/api/jobs/unfinished` | Returns all incomplete or user-saved unfinished jobs. |
| `POST` | `/api/jobs/resume/{job_id}` | Recovers and resumes an interrupted job from safe state. |
| `POST` | `/api/jobs/save-exit` | Saves active job state for later resume (`Save & Exit`). |
| `POST` | `/api/jobs/discard/{job_id}` | Safely discards an unfinished job. |
| `POST` | `/api/pdf/view` | Securely retrieves and Base64-encodes a PDF for in-browser viewing. |
| `GET` | `/api/file-tree/{job_id}` | Returns filesystem hierarchy for the job output directory. |
| `GET` | `/api/status/{job_id}` | Returns live progress state for single job tracking. |
| `GET` | `/api/history` | Queries conversion metadata records from MongoDB. |
| `GET` | `/api/health` | Service health status and MongoDB connection state. |
