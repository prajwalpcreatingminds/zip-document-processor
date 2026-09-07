import os
import shutil
import uuid
from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile, status

from app.config.settings import settings
from app.models.schemas import (
    ConversionFileResult,
    ConversionResponse,
    ConvertRequest,
    ExtractionResponse,
    ExtractRequest,
    JobStatusResponse,
    UploadResponse,
)
from app.repositories.mongo_repository import MongoRepository
from app.services.document_service import DocumentService
from app.services.conversion_service import ConversionService
from app.services.zip_service import ZipService
from app.utils.logger import logger
from app.utils.security import sanitize_filename, sanitize_folder_name

from fastapi.responses import FileResponse

router = APIRouter(prefix="/api", tags=["Document Processing"])

# In-memory storage for active jobs
active_jobs: dict[str, dict[str, Any]] = {}


@router.post("/upload", response_model=UploadResponse)


@router.post("/upload", response_model=UploadResponse)
async def upload_zip(
    file: UploadFile = File(...),
    folder_name: str = Form(...),
):
    """
    Step 1 & 2: Accept ZIP file and user-specified folder name.
    Validates ZIP, sanitizes folder name, and stages file for extraction.
    """
    if not file.filename or not file.filename.lower().endswith(".zip"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Only ZIP (.zip) files are accepted.",
        )

    try:
        clean_folder = sanitize_folder_name(folder_name)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    job_id = str(uuid.uuid4())
    safe_zip_name = sanitize_filename(file.filename)
    staged_zip_path = settings.TEMP_DIR / f"{job_id}_{safe_zip_name}"

    try:
        with open(staged_zip_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        logger.error(f"Failed to save uploaded ZIP: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process upload: {e}",
        )

    # Register job state
    active_jobs[job_id] = {
        "job_id": job_id,
        "folder_name": clean_folder,
        "original_zip_name": safe_zip_name,
        "staged_zip_path": staged_zip_path,
        "parent_dir": None,
        "stage": "UPLOADED",
        "current_file": None,
        "current_index": 0,
        "total_to_convert": 0,
        "converted_count": 0,
        "failed_count": 0,
        "error_message": None,
        "extraction_summary": None,
        "conversion_summary": None,
    }

    logger.info(f"Staged ZIP upload for job '{job_id}' (Folder: '{clean_folder}')")

    return UploadResponse(
        success=True,
        job_id=job_id,
        folder_name=clean_folder,
        original_zip=safe_zip_name,
        message="ZIP file uploaded and staged successfully.",
    )


@router.post("/extract", response_model=ExtractionResponse)
async def extract_zip(request: ExtractRequest):
    """
    Step 3, 4 & 5: Extracts ALL supported files into Word/ and PDF/ folders.
    Preserves original ZIP inside the parent folder.
    Does NOT convert Word documents at this stage.
    """
    job_id = request.job_id
    job = active_jobs.get(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job '{job_id}' not found.",
        )

    try:
        # Create parent folder structure (e.g. storage/job description/Word and PDF)
        parent_dir = ZipService.create_job_folder(job["folder_name"])
        job["parent_dir"] = parent_dir
        job["folder_name"] = parent_dir.name  # in case suffix was appended

        # Unpack and classify
        extract_result = ZipService.extract_and_organize_zip(
            zip_file_path=job["staged_zip_path"],
            parent_dir=parent_dir,
            original_zip_name=job["original_zip_name"],
        )

        response = ExtractionResponse(
            success=True,
            job_id=job_id,
            folder_name=extract_result["folder_name"],
            original_zip=extract_result["original_zip"],
            total_supported_files=extract_result["total_supported_files"],
            word_files=extract_result["word_count"],
            word_file_list=extract_result["word_files"],
            existing_pdf_files=extract_result["existing_pdf_count"],
            existing_pdf_list=extract_result["existing_pdf_files"],
            unsupported_files=extract_result["unsupported_count"],
            unsupported_file_list=extract_result["unsupported_files"],
            word_folder=extract_result["word_folder"],
            pdf_folder=extract_result["pdf_folder"],
            message="Files extracted and categorized into Word/ and PDF/ folders.",
        )

        job["stage"] = "EXTRACTED"
        job["extraction_summary"] = response
        return response

    except Exception as e:
        logger.error(f"Extraction failed for job {job_id}: {e}")
        job["stage"] = "FAILED"
        job["error_message"] = str(e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Extraction failed: {e}",
        )


@router.post("/convert", response_model=ConversionResponse)
async def convert_word_documents(request: ConvertRequest):
    """
    Step 6 & 7: Converts .doc and .docx files in Word/ to PDF/ after user confirmation.
    Stores generated PDFs in PDF/ and leaves original Word files intact in Word/.
    Logs conversion records to MongoDB.
    """
    job_id = request.job_id
    job = active_jobs.get(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job '{job_id}' not found.",
        )

    parent_dir: Optional[Path] = job.get("parent_dir")
    if not parent_dir or not parent_dir.exists():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Files must be extracted before running conversion.",
        )

    job["stage"] = "CONVERTING"

    # Progress callback for tracking live conversion
    async def update_progress(data: dict[str, Any]):
        job["current_file"] = data.get("current_file")
        job["current_index"] = data.get("current_index", 0)
        job["total_to_convert"] = data.get("total_to_convert", 0)
        job["converted_count"] = data.get("converted_count", 0)
        job["failed_count"] = data.get("failed_count", 0)

    try:
        conversion_result = await ConversionService.convert_all_word_documents(
            parent_folder=parent_dir,
            progress_callback=update_progress,
        )

        # Batch persist to MongoDB
        all_results = conversion_result["converted_files"] + conversion_result["failed_files"]
        await MongoRepository.save_batch_records(
            job_id=job_id,
            source_folder=job["folder_name"],
            results=all_results,
        )

        # Calculate exact PDF counts (Existing vs Converted vs Total)
        extraction_summary: Optional[ExtractionResponse] = job.get("extraction_summary")
        existing_pdf_count = extraction_summary.existing_pdf_files if extraction_summary else 0
        converted_pdf_count = conversion_result["successfully_converted"]
        total_pdf_count = existing_pdf_count + converted_pdf_count

        word_dir = parent_dir / "Word"
        pdf_dir = parent_dir / "PDF"
        file_tree = DocumentService.build_file_tree(parent_dir)

        response = ConversionResponse(
            success=True,
            job_id=job_id,
            folder_name=job["folder_name"],
            word_files_found=conversion_result["word_files_found"],
            successfully_converted=conversion_result["successfully_converted"],
            failed_files_count=conversion_result["failed_files_count"],
            failed_files=[ConversionFileResult(**f) for f in conversion_result["failed_files"]],
            converted_files=[ConversionFileResult(**f) for f in conversion_result["converted_files"]],
            existing_pdf_count=existing_pdf_count,
            converted_pdf_count=converted_pdf_count,
            total_pdf_count=total_pdf_count,
            word_folder=str(word_dir.relative_to(settings.PROJECT_ROOT) if word_dir.is_relative_to(settings.PROJECT_ROOT) else word_dir),
            pdf_folder=str(pdf_dir.relative_to(settings.PROJECT_ROOT) if pdf_dir.is_relative_to(settings.PROJECT_ROOT) else pdf_dir),
            file_tree=file_tree,
            message="Word documents converted successfully.",
        )

        job["stage"] = "COMPLETED"
        job["conversion_summary"] = response
        return response

    except Exception as e:
        logger.error(f"Conversion failed for job {job_id}: {e}")
        job["stage"] = "FAILED"
        job["error_message"] = str(e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Conversion process failed: {e}",
        )


@router.post("/finish-without-conversion")
async def finish_without_conversion(request: ConvertRequest):
    """
    If user clicks 'No, Finish', mark job as complete without converting Word documents.
    """
    job_id = request.job_id
    job = active_jobs.get(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job '{job_id}' not found.",
        )

    job["stage"] = "FINISHED_NO_CONVERSION"
    return {
        "success": True,
        "job_id": job_id,
        "message": "Processing finished. Word files were extracted and no conversion was performed."
    }


@router.get("/status/{job_id}", response_model=JobStatusResponse)
async def get_job_status(job_id: str):
    """
    Provides real-time tracking of job progress.
    """
    job = active_jobs.get(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job '{job_id}' not found.",
        )

    return JobStatusResponse(
        job_id=job["job_id"],
        folder_name=job["folder_name"],
        stage=job["stage"],
        current_file=job.get("current_file"),
        current_index=job.get("current_index", 0),
        total_to_convert=job.get("total_to_convert", 0),
        converted_count=job.get("converted_count", 0),
        failed_count=job.get("failed_count", 0),
        error_message=job.get("error_message"),
        extraction_summary=job.get("extraction_summary"),
        conversion_summary=job.get("conversion_summary"),
    )


@router.get("/history")
async def get_conversion_history(
    folder_name: Optional[str] = Query(None, description="Filter by source folder name"),
    status: Optional[str] = Query(None, description="Filter by conversion status (SUCCESS/FAILED)"),
    limit: int = Query(100, ge=1, le=500),
):
    """
    Queries conversion metadata from MongoDB collection 'conversion'.
    """
    records = await MongoRepository.get_conversion_history(
        folder_name=folder_name,
        status=status,
        limit=limit,
    )
    return {
        "success": True,
        "count": len(records),
        "records": records,
    }


@router.get("/file-tree/{job_id}")
async def get_file_tree(job_id: str):
    """
    Returns the current filesystem tree structure for a job folder.
    """
    job = active_jobs.get(job_id)
    if not job or not job.get("parent_dir"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Folder not found or extraction not completed.",
        )
    tree = DocumentService.build_file_tree(job["parent_dir"])
    return {"success": True, "file_tree": tree}
