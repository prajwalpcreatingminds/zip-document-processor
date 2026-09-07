# ZIP Document Processor — Pipeline & Word-to-PDF Converter

A full-stack, enterprise document processing system built with **FastAPI (Python)**, **Next.js 16 (React / TypeScript / Tailwind CSS)**, and **MongoDB**.

---

## 📋 Table of Contents
- [Frontend Folder Setup and Run](#-frontend-folder-setup-and-run)
- [Backend Folder Setup and Run](#-backend-folder-setup-and-run)
- [Workflow Overview](#-workflow-overview)
- [Project Directory Structure](#-project-directory-structure)
- [Output Folder Structure](#-output-folder-structure)
- [API Endpoints Reference](#-api-endpoints-reference)

---

## 💻 Frontend Folder Setup and Run:

1. **Extract the codebase zip**.
2. **Open the Codebase Extracted Folder in Antigravity** by clicking **File -> Open Folder**.
3. **Navigate to the Folder Path**, click on the Folder, and click the **“Select Folder”** button.
4. **Go to the frontend folder**, type `cd frontend` in the terminal:
   ```bash
   cd frontend
   ```
5. **Type the command in the terminal**:
   ```bash
   npm install
   ```
6. **Type the command in the terminal**:
   ```bash
   npm run dev
   ```
7. **Note**: On Windows, if it still didn't identify `npm run dev`, and says *"I don't have permission to run this"*, then run this command in PowerShell:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```
8. **Note**: Execute `npm run build`:
   ```bash
   npm run build
   ```
   *When you run this command, Next.js takes your raw source code and transforms it into a version that is ready to be put on a live server for users to visit.*

---

## 🐍 Backend Folder Setup and Run:

1. **Extract the codebase zip**.
2. **Open the Codebase Extracted Folder in Antigravity** by clicking **File -> Open Folder**.
3. **Navigate to the Folder Path**, click on the Folder, and click the **“Select Folder”** button.
4. **Go to the backend folder**, type `cd backend` in the terminal:
   ```bash
   cd backend
   ```
5. **Type the command in the terminal**:
   ```bash
   python -m venv venv
   ```
6. **To activate the environment, type the command**:
   - **a. In PowerShell**:
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
   - **b. In Command Prompt (CMD)**:
     ```cmd
     .\venv\Scripts\activate.bat
     ```
   - **c. In Bash (Linux / macOS / Git Bash)**:
     ```bash
     source venv/Scripts/activate
     # or on Linux/macOS:
     # source venv/bin/activate
     ```
7. **Then to install the requirements.txt, type the command**:
   ```bash
   pip install -r requirements.txt
   ```
8. **To run the code**:
   - **a. Windows**:
     ```bash
     make win
     ```
     *(or `python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload`)*
   - **b. Linux / macOS**:
     ```bash
     make dev
     ```
     *(or `python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload`)*

---

## 🔄 Workflow Overview

```
Step 1: Upload ZIP         → Select archive (.zip up to 200MB)
       ↓
Step 2: Target Folder      → Specify destination folder (e.g. "job description", "resume")
       ↓
Step 3: Confirmation       → Review source archive and target folder before extraction
       ↓
Step 4: Extraction         → Unpacks into Output/<folder>/Word and Output/<folder>/PDF
       ↓
Step 5: Convert Decision   → Prompt user whether to convert Word files to PDF
       ↓
Step 6: Conversion         → Converts .doc / .docx to PDF with live filename progress
       ↓
Step 7: Summary & Report   → Executive counts, detailed file table, and CSV report download
```

---

## 📁 Project Directory Structure

```
zip-document-processor/
├── Makefile                 # Make automation targets (make win, make dev, make win-front)
├── README.md                # Project documentation & setup instructions
├── Output/                  # Processed job outputs (Word/, PDF/, original ZIP)
├── backend/                 # FastAPI Python REST API
│   ├── app/
│   │   ├── api/             # API routes (/upload, /extract, /convert, /history)
│   │   ├── config/          # Settings & environment configuration
│   │   ├── models/          # Pydantic schemas
│   │   ├── repositories/    # MongoDB database repository
│   │   ├── services/        # ConversionService, ZipService, DocumentService
│   │   └── utils/           # Security sanitization & logger
│   ├── Makefile             # Backend-specific Makefile (make win, make dev)
│   ├── requirements.txt     # Python dependencies
│   ├── .env                 # Backend environment config
│   └── .env.example         # Environment template
└── frontend/                # Next.js 16 / TypeScript / Tailwind CSS UI
    ├── src/
    │   ├── app/
    │   │   ├── upload/      # Step 1: Upload ZIP
    │   │   ├── folder/      # Step 2: Target Folder
    │   │   ├── confirmation/# Step 3: Confirmation
    │   │   ├── extraction/  # Step 4: Extraction
    │   │   ├── decision/    # Step 5: Convert Decision
    │   │   ├── conversion/  # Step 6: Conversion Progress
    │   │   ├── summary/     # Step 7: Summary & Processing Report
    │   │   ├── layout.tsx   # Root layout & shell
    │   │   └── page.tsx     # Root entry point
    │   ├── components/      # UI components & FileProcessingReport
    │   ├── context/         # WorkflowContext state manager
    │   ├── services/        # Backend API fetch client
    │   └── types/           # TypeScript interfaces
    └── package.json         # Frontend dependencies
```

---

## 🗂️ Output Folder Structure

When a ZIP is processed into a folder name (e.g. `job description`), it is organized in the root `Output/` directory:

```
Output/
└── job description/
    ├── documents.zip        # Original uploaded ZIP file (preserved)
    ├── Word/                # All original .doc and .docx files (untouched)
    │   ├── developer.docx
    │   └── analyst.doc
    └── PDF/                 # Generated PDFs + any pre-existing PDFs
        ├── policy.pdf       # (Existing PDF from ZIP)
        ├── developer.pdf    # (Converted from developer.docx)
        └── analyst.pdf      # (Converted from analyst.doc)
```

---

## 🔌 API Endpoints Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/upload` | Stages uploaded ZIP file and user-specified folder name. |
| `POST` | `/api/extract` | Extracts and classifies files into `Word/` and `PDF/` folders. |
| `POST` | `/api/convert` | Converts Word documents in `Word/` to PDF in `PDF/` and logs to MongoDB. |
| `POST` | `/api/finish-without-conversion` | Finalizes job when user chooses to skip conversion. |
| `GET` | `/api/status/{job_id}` | Returns live progress state for conversion tracking. |
| `GET` | `/api/history` | Returns conversion metadata audit logs from MongoDB. |
| `GET` | `/api/health` | Service health status and MongoDB connection state. |
