import os
import shutil
import uuid
import base64
from pathlib import Path
from typing import Any, Optional
import json

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse

from config.settings import settings
from app.schemas import (
    BatchJobInfo,
    BatchStatusResponse,
    BatchUploadResponse,
    ConversionFileResult,
    ConversionResponse,
    ConvertRequest,
    ExtractionResponse,
    ExtractRequest,
    JobStatusResponse,
    UploadResponse,
    UnfinishedJobItem,
    UnfinishedJobsResponse,
    ResumeJobResponse,
    SaveExitRequest,
    PdfViewRequest,
    PdfViewResponse,
)
from repositories.mongo_repository import MongoRepository
from app.services.document_service import DocumentService
from app.services.conversion_service import ConversionService
from app.services.zip_service import ZipService
from app.utils.logger import logger
from app.utils.security import sanitize_filename, sanitize_folder_name, is_safe_path

router = APIRouter(prefix="/api", tags=["Document Processing"])

# In-memory storage for active jobs and batches
active_jobs: dict[str, dict[str, Any]] = {}
active_batches: dict[str, dict[str, Any]] = {}


@router.post("/upload", response_model=UploadResponse)
async def upload_zip(
    file: UploadFile = File(...),
    folder_name: str = Form(...),
):
    """
    Step 1 & 2: Accept supported archive file (.zip, .rar, .7z, .tar, .tgz, .tar.xz)
    and user-specified folder name.
    Validates format, sanitizes folder name, and stages file for extraction.
    """
    if not file.filename or not ZipService.is_supported_archive(file.filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Supported archive formats: .zip, .rar, .7z, .tar, .tgz, .tar.xz",
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
        logger.error(f"Failed to save uploaded archive: {e}")
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

    # Persist job state in MongoDB
    await MongoRepository.create_or_update_job(
        job_id=job_id,
        job_data={
            "job_id": job_id,
            "batch_id": None,
            "folder_name": clean_folder,
            "original_archive_name": safe_zip_name,
            "archive_format": ZipService.get_archive_format(safe_zip_name),
            "staged_archive_path": str(staged_zip_path),
            "output_dir": str(settings.STORAGE_DIR / clean_folder),
            "stage": "UPLOADED",
            "step": 1,
            "is_unfinished": True,
            "user_saved": False,
        },
    )

    logger.info(f"Staged archive upload for job '{job_id}' (Folder: '{clean_folder}')")

    return UploadResponse(
        success=True,
        job_id=job_id,
        folder_name=clean_folder,
        original_zip=safe_zip_name,
        message="Archive file uploaded and staged successfully.",
    )


@router.post("/batch/upload", response_model=BatchUploadResponse)
async def upload_batch_archives(
    files: list[UploadFile] = File(...),
    folder_mode: str = Form("SAME"),  # "SAME" | "DIFFERENT"
    folder_name: Optional[str] = Form(None),
    folder_names: Optional[list[str]] = Form(None),
    folder_map_json: Optional[str] = Form(None),
):
    """
    Feature 3: Accept multiple supported archive files (.zip, .rar, .7z, .tar, .tgz, .tar.xz)
    and assign parent folders in 'SAME' or 'DIFFERENT' mode.
    Creates independent job records for each archive.
    """
    if not files or len(files) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No archive files provided. Please select at least one archive file.",
        )

    # Validate all file extensions
    for f in files:
        if not f.filename or not ZipService.is_supported_archive(f.filename):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file format for '{f.filename}'. Supported formats: .zip, .rar, .7z, .tar, .tgz, .tar.xz",
            )

    # Parse folder assignments
    folder_map: dict[str, str] = {}
    if folder_map_json:
        try:
            folder_map = json.loads(folder_map_json)
        except Exception:
            pass

    batch_id = str(uuid.uuid4())
    job_infos: list[BatchJobInfo] = []
    batch_job_ids: list[str] = []

    for index, file in enumerate(files, start=1):
        filename = file.filename or f"archive_{index}.zip"
        # Determine assigned target folder
        if folder_mode == "DIFFERENT":
            if filename in folder_map:
                assigned_folder = folder_map[filename]
            elif folder_names and len(folder_names) >= index:
                assigned_folder = folder_names[index - 1]
            else:
                assigned_folder = Path(filename).stem.replace("_", " ").replace("-", " ")
        else:
            # SAME mode
            assigned_folder = folder_name or (folder_names[0] if folder_names else "Batch Documents")

        try:
            clean_folder = sanitize_folder_name(assigned_folder)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

        job_id = str(uuid.uuid4())
        safe_zip_name = sanitize_filename(filename)
        staged_zip_path = settings.TEMP_DIR / f"{job_id}_{safe_zip_name}"

        try:
            with open(staged_zip_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            file_size = staged_zip_path.stat().st_size
        except Exception as e:
            logger.error(f"Failed to stage archive {filename}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to stage archive '{filename}': {e}",
            )

        active_jobs[job_id] = {
            "job_id": job_id,
            "batch_id": batch_id,
            "order": index,
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

        # Persist job state in MongoDB
        await MongoRepository.create_or_update_job(
            job_id=job_id,
            job_data={
                "job_id": job_id,
                "batch_id": batch_id,
                "folder_name": clean_folder,
                "original_archive_name": safe_zip_name,
                "archive_format": ZipService.get_archive_format(safe_zip_name),
                "staged_archive_path": str(staged_zip_path),
                "output_dir": str(settings.STORAGE_DIR / clean_folder),
                "stage": "UPLOADED",
                "step": 1,
                "is_unfinished": True,
                "user_saved": False,
            },
        )

        job_infos.append(
            BatchJobInfo(
                job_id=job_id,
                folder_name=clean_folder,
                original_zip=safe_zip_name,
                filename=safe_zip_name,
                file_size_bytes=file_size,
                order=index,
            )
        )
        batch_job_ids.append(job_id)

    active_batches[batch_id] = {
        "batch_id": batch_id,
        "job_ids": batch_job_ids,
        "total_jobs": len(job_infos),
        "created_at": str(uuid.uuid1()),
    }

    logger.info(f"Staged batch '{batch_id}' with {len(job_infos)} archives (Mode: {folder_mode})")

    return BatchUploadResponse(
        success=True,
        batch_id=batch_id,
        total_jobs=len(job_infos),
        jobs=job_infos,
        message=f"{len(job_infos)} archive(s) staged successfully for batch processing.",
    )


@router.get("/batch/status/{batch_id}", response_model=BatchStatusResponse)
async def get_batch_status(batch_id: str):
    """
    Returns aggregated status for all jobs in a batch.
    """
    batch = active_batches.get(batch_id)
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Batch '{batch_id}' not found.",
        )

    job_statuses: list[JobStatusResponse] = []
    completed_count = 0
    failed_count = 0

    for jid in batch.get("job_ids", []):
        job = active_jobs.get(jid)
        if job:
            stage = job.get("stage", "UPLOADED")
            if stage in {"COMPLETED", "FINISHED_NO_CONVERSION"}:
                completed_count += 1
            elif stage == "FAILED":
                failed_count += 1

            job_statuses.append(
                JobStatusResponse(
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
            )

    total = len(batch.get("job_ids", []))
    is_finished = (completed_count + failed_count) == total

    return BatchStatusResponse(
        batch_id=batch_id,
        total_jobs=total,
        completed_jobs=completed_count,
        failed_jobs=failed_count,
        is_finished=is_finished,
        jobs=job_statuses,
    )


@router.post("/extract", response_model=ExtractionResponse)
async def extract_zip(request: ExtractRequest):
    """
    Step 3, 4 & 5: Extracts ALL supported files into Word/ and PDF/ folders.
    Preserves original archive inside the parent folder.
    Does NOT convert Word documents at this stage.
    """
    job_id = request.job_id
    job = active_jobs.get(job_id)
    if not job:
        # Check if job exists in MongoDB
        db_job = await MongoRepository.get_job(job_id)
        if db_job:
            folder_name = db_job.get("folder_name", "default")
            orig_name = db_job.get("original_archive_name", "archive.zip")
            staged_path = Path(db_job.get("staged_archive_path")) if db_job.get("staged_archive_path") else (settings.TEMP_DIR / f"{job_id}_{orig_name}")
            parent_dir = Path(db_job.get("output_dir")) if db_job.get("output_dir") else (settings.STORAGE_DIR / folder_name)
            if not staged_path.exists() and (parent_dir / orig_name).exists():
                staged_path = parent_dir / orig_name

            job = {
                "job_id": job_id,
                "batch_id": db_job.get("batch_id"),
                "folder_name": folder_name,
                "original_zip_name": orig_name,
                "staged_zip_path": staged_path,
                "parent_dir": parent_dir if parent_dir.exists() else None,
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
            active_jobs[job_id] = job
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Job '{job_id}' not found.",
            )

    # Persist extraction start
    await MongoRepository.update_job_stage(job_id=job_id, stage="EXTRACTING", step=4)

    try:
        # If parent_dir already exists on resume, use it; otherwise create clean folder
        if job.get("parent_dir") and Path(job["parent_dir"]).exists():
            parent_dir = Path(job["parent_dir"])
        else:
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
            total_supported_files=extract_result.get("total_supported_files", 0),
            total_files=extract_result.get("total_files", 0),
            word_files=extract_result["word_count"],
            word_file_list=extract_result["word_files"],
            existing_pdf_files=extract_result["existing_pdf_count"],
            existing_pdf_list=extract_result["existing_pdf_files"],
            other_files=extract_result.get("other_count", 0),
            other_file_list=extract_result.get("other_files", []),
            unsupported_files=extract_result.get("unsupported_count", 0),
            unsupported_file_list=extract_result.get("unsupported_files", []),
            word_folder=extract_result["word_folder"],
            pdf_folder=extract_result["pdf_folder"],
            other_folder=extract_result.get("other_folder"),
            message="Files extracted and organized into Word/, PDF/, and Other/ folders.",
        )

        job["stage"] = "EXTRACTED"
        job["extraction_summary"] = response

        # Persist extracted state in MongoDB
        await MongoRepository.update_job_stage(
            job_id=job_id,
            stage="EXTRACTED",
            step=5,
            is_unfinished=True,
            folder_name=extract_result["folder_name"],
            output_dir=str(parent_dir),
            extraction_summary=response.model_dump(),
        )

        return response

    except ValueError as e:
        logger.error(f"Extraction validation error for job {job_id}: {e}")
        job["stage"] = "FAILED"
        job["error_message"] = str(e)
        await MongoRepository.update_job_stage(job_id=job_id, stage="FAILED", error_message=str(e))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Extraction failed for job {job_id}: {e}")
        job["stage"] = "FAILED"
        job["error_message"] = str(e)
        await MongoRepository.update_job_stage(job_id=job_id, stage="FAILED", error_message=str(e))
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
    Supports file-level resume by skipping already completed valid PDFs.
    """
    job_id = request.job_id
    job = active_jobs.get(job_id)
    if not job:
        # Attempt to recover from MongoDB
        db_job = await MongoRepository.get_job(job_id)
        if db_job:
            folder_name = db_job.get("folder_name", "default")
            orig_name = db_job.get("original_archive_name", "archive.zip")
            parent_dir = Path(db_job.get("output_dir")) if db_job.get("output_dir") else (settings.STORAGE_DIR / folder_name)
            staged_path = Path(db_job.get("staged_archive_path")) if db_job.get("staged_archive_path") else (settings.TEMP_DIR / f"{job_id}_{orig_name}")
            if not staged_path.exists() and (parent_dir / orig_name).exists():
                staged_path = parent_dir / orig_name

            job = {
                "job_id": job_id,
                "batch_id": db_job.get("batch_id"),
                "folder_name": folder_name,
                "original_zip_name": orig_name,
                "staged_zip_path": staged_path,
                "parent_dir": parent_dir if parent_dir.exists() else None,
                "stage": "EXTRACTED",
                "current_file": None,
                "current_index": 0,
                "total_to_convert": 0,
                "converted_count": 0,
                "failed_count": 0,
                "error_message": None,
                "extraction_summary": None,
                "conversion_summary": None,
            }
            if db_job.get("extraction_summary"):
                try:
                    job["extraction_summary"] = ExtractionResponse(**db_job["extraction_summary"])
                except Exception:
                    pass
            active_jobs[job_id] = job
        else:
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
    await MongoRepository.update_job_stage(job_id=job_id, stage="CONVERTING", step=6, is_unfinished=True)

    # Progress callback for tracking live conversion and incremental persistence
    async def update_progress(data: dict[str, Any]):
        job["current_file"] = data.get("current_file")
        job["current_index"] = data.get("current_index", 0)
        job["total_to_convert"] = data.get("total_to_convert", 0)
        job["converted_count"] = data.get("converted_count", 0)
        job["failed_count"] = data.get("failed_count", 0)

        # Update MongoDB progress after each file
        await MongoRepository.update_job_stage(
            job_id=job_id,
            stage="CONVERTING",
            step=6,
            converted_count=data.get("converted_count", 0),
            total_to_convert=data.get("total_to_convert", 0),
        )

    try:
        conversion_result = await ConversionService.convert_all_word_documents(
            parent_folder=parent_dir,
            progress_callback=update_progress,
            skip_existing_valid=True,
        )

        # Batch persist individual file records to MongoDB conversion history
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

        # Mark job completed and finished in MongoDB
        await MongoRepository.update_job_stage(
            job_id=job_id,
            stage="COMPLETED",
            step=7,
            is_unfinished=False,
            converted_count=conversion_result["successfully_converted"],
            total_to_convert=conversion_result["word_files_found"],
            conversion_summary=response.model_dump(),
        )

        return response

    except Exception as e:
        logger.error(f"Conversion failed for job {job_id}: {e}")
        job["stage"] = "FAILED"
        job["error_message"] = str(e)
        await MongoRepository.update_job_stage(job_id=job_id, stage="FAILED", error_message=str(e))
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
        db_job = await MongoRepository.get_job(job_id)
        if not db_job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Job '{job_id}' not found.",
            )

    if job:
        job["stage"] = "FINISHED_NO_CONVERSION"

    await MongoRepository.update_job_stage(
        job_id=job_id,
        stage="FINISHED_NO_CONVERSION",
        step=7,
        is_unfinished=False,
    )

    return {
        "success": True,
        "job_id": job_id,
        "message": "Processing finished. Word files were extracted and no conversion was performed."
    }


@router.get("/jobs/unfinished", response_model=UnfinishedJobsResponse)
async def get_unfinished_jobs():
    """
    Feature 4: Queries all incomplete or user-saved unfinished jobs.
    """
    db_jobs = await MongoRepository.get_unfinished_jobs()
    items: list[UnfinishedJobItem] = []

    for doc in db_jobs:
        jid = doc.get("job_id")
        if not jid:
            continue

        active = active_jobs.get(jid)
        stage = (active.get("stage") if active else doc.get("stage")) or "UPLOADED"
        step = doc.get("step", 1)

        total_files = 0
        word_count = 0
        ext_sum = doc.get("extraction_summary")
        if ext_sum:
            total_files = ext_sum.get("total_files", 0)
            if isinstance(ext_sum.get("word_files"), int):
                word_count = ext_sum.get("word_files", 0)
            elif isinstance(ext_sum.get("word_file_list"), list):
                word_count = len(ext_sum.get("word_file_list", []))

        converted_count = (active.get("converted_count") if active else doc.get("converted_count", 0)) or 0
        failed_count = (active.get("failed_count") if active else doc.get("failed_count", 0)) or 0
        total_to_conv = doc.get("total_to_convert", word_count)

        items.append(
            UnfinishedJobItem(
                job_id=jid,
                batch_id=doc.get("batch_id"),
                folder_name=doc.get("folder_name", "default"),
                original_archive_name=doc.get("original_archive_name", "archive.zip"),
                archive_format=doc.get("archive_format"),
                stage=stage,
                step=step,
                is_unfinished=True,
                user_saved=doc.get("user_saved", False),
                total_files=total_files,
                word_files_count=total_to_conv or word_count,
                converted_count=converted_count,
                failed_count=failed_count,
                error_message=doc.get("error_message"),
                created_at=doc.get("created_at"),
                updated_at=doc.get("updated_at"),
            )
        )

    return UnfinishedJobsResponse(success=True, total=len(items), jobs=items)


@router.post("/jobs/resume/{job_id}", response_model=ResumeJobResponse)
async def resume_job(job_id: str):
    """
    Feature 4: Rehydrates job state from MongoDB and filesystem,
    determines the safe resume step, and returns resume payload.
    """
    job_record = await MongoRepository.get_job(job_id)
    active = active_jobs.get(job_id)

    if not job_record and not active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job '{job_id}' not found.",
        )

    folder_name = (active.get("folder_name") if active else job_record.get("folder_name")) or "default"
    orig_name = (active.get("original_zip_name") if active else job_record.get("original_archive_name")) or "archive.zip"
    stage = (active.get("stage") if active else job_record.get("stage")) or "UPLOADED"
    step = job_record.get("step", 1) if job_record else 1

    parent_dir = Path(job_record.get("output_dir")) if job_record and job_record.get("output_dir") else (settings.STORAGE_DIR / folder_name)
    staged_zip_path = Path(job_record.get("staged_archive_path")) if job_record and job_record.get("staged_archive_path") else (settings.TEMP_DIR / f"{job_id}_{orig_name}")

    # Check preserved archive inside parent output dir
    preserved_archive = parent_dir / orig_name
    if not staged_zip_path.exists() and preserved_archive.exists():
        staged_zip_path = preserved_archive

    # Rehydrate active_jobs
    active_jobs[job_id] = {
        "job_id": job_id,
        "batch_id": job_record.get("batch_id") if job_record else None,
        "folder_name": folder_name,
        "original_zip_name": orig_name,
        "staged_zip_path": staged_zip_path,
        "parent_dir": parent_dir if parent_dir.exists() else None,
        "stage": stage,
        "current_file": None,
        "current_index": 0,
        "total_to_convert": 0,
        "converted_count": 0,
        "failed_count": 0,
        "error_message": None,
        "extraction_summary": None,
        "conversion_summary": None,
    }

    # Determine safe resume step & target route
    target_route = "/extraction"
    resume_step = 4

    if stage in {"EXTRACTED"}:
        target_route = "/decision"
        resume_step = 5
    elif stage in {"CONVERTING"}:
        target_route = "/conversion"
        resume_step = 6
    elif stage in {"COMPLETED", "FINISHED_NO_CONVERSION"}:
        target_route = "/summary"
        resume_step = 7
    elif stage in {"UPLOADED", "EXTRACTING"}:
        target_route = "/extraction"
        resume_step = 4

    ext_sum_data = job_record.get("extraction_summary") if job_record else None
    ext_sum = None
    if ext_sum_data:
        try:
            ext_sum = ExtractionResponse(**ext_sum_data)
            active_jobs[job_id]["extraction_summary"] = ext_sum
        except Exception:
            pass

    return ResumeJobResponse(
        success=True,
        job_id=job_id,
        batch_id=job_record.get("batch_id") if job_record else None,
        folder_name=folder_name,
        original_archive_name=orig_name,
        stage=stage,
        step=resume_step,
        target_route=target_route,
        extraction_summary=ext_sum,
        converted_count=job_record.get("converted_count", 0) if job_record else 0,
        total_to_convert=job_record.get("total_to_convert", 0) if job_record else 0,
        message=f"Job resumed at step {resume_step} ({stage}).",
    )


@router.post("/jobs/save-exit")
async def save_and_exit_job(request: SaveExitRequest):
    """
    Feature 4: Explicitly saves active job state with user_saved=True, is_unfinished=True.
    """
    job_id = request.job_id
    active = active_jobs.get(job_id)

    stage = (active.get("stage") if active else "UPLOADED") or "UPLOADED"
    folder_name = request.folder_name or (active.get("folder_name") if active else "default")
    step = request.step or (5 if stage == "EXTRACTED" else (6 if stage == "CONVERTING" else 4))

    await MongoRepository.update_job_stage(
        job_id=job_id,
        stage=stage,
        step=step,
        is_unfinished=True,
        user_saved=True,
        folder_name=folder_name,
    )
    return {"success": True, "job_id": job_id, "message": "Job saved for later resume."}


@router.post("/jobs/discard/{job_id}")
@router.delete("/jobs/{job_id}")
async def discard_job(job_id: str):
    """
    Feature 4: Discards an unfinished job safely. Cleans up staged temp files.
    Does not delete shared parent folders to prevent accidental data loss.
    """
    active = active_jobs.pop(job_id, None)
    if active and active.get("staged_zip_path"):
        staged_p = Path(active["staged_zip_path"])
        if staged_p.exists() and "temp" in str(staged_p).lower():
            try:
                staged_p.unlink()
            except Exception:
                pass

    await MongoRepository.delete_job(job_id)
    return {"success": True, "job_id": job_id, "message": "Job discarded successfully."}


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


@router.post("/pdf/view", response_model=PdfViewResponse)
async def view_pdf(request: PdfViewRequest):
    """
    Feature 5: In-Browser PDF Viewer endpoint.
    1. Looks up job_id in MongoDB (or active_jobs).
    2. Resolves output_dir / "PDF" / sanitized_filename.
    3. Validates path safety, file existence, and PDF integrity.
    4. Encodes PDF binary content to Base64 and returns payload.
    """
    job_id = request.job_id
    raw_filename = request.filename

    if not job_id or not job_id.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Job ID is required.",
        )

    if not raw_filename or not raw_filename.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename is required.",
        )

    # 1. Look up job in active_jobs or MongoDB
    job = active_jobs.get(job_id)
    output_dir_str = None
    if job and job.get("parent_dir"):
        output_dir_str = str(job["parent_dir"])
    else:
        db_job = await MongoRepository.get_job(job_id)
        if db_job:
            output_dir_str = db_job.get("output_dir")
            if not output_dir_str and db_job.get("folder_name"):
                output_dir_str = str(settings.STORAGE_DIR / db_job["folder_name"])

    if not output_dir_str:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job '{job_id}' not found.",
        )

    output_dir = Path(output_dir_str)
    pdf_dir = output_dir / "PDF"

    # 2. Validate filename is a PDF
    if not raw_filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Requested file is not a PDF.",
        )

    # 3. Sanitize filename and construct target path
    clean_name = sanitize_filename(raw_filename)
    target_path = pdf_dir / clean_name

    # 4. Guard against path traversal
    if not is_safe_path(pdf_dir, target_path):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Access denied: invalid file path requested.",
        )

    # 5. Verify file exists
    if not target_path.exists() or not target_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"PDF file '{clean_name}' not found on disk for job '{job_id}'.",
        )

    # 6. Validate PDF content and non-empty size
    if not ConversionService.is_valid_pdf(target_path):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File '{clean_name}' is not a valid PDF or is corrupted (0 bytes).",
        )

    # 7. Read binary and Base64 encode
    try:
        pdf_bytes = target_path.read_bytes()
        base64_encoded = base64.b64encode(pdf_bytes).decode("utf-8")
        file_size = len(pdf_bytes)

        return PdfViewResponse(
            success=True,
            job_id=job_id,
            filename=clean_name,
            base64_data=base64_encoded,
            mime_type="application/pdf",
            size_bytes=file_size,
            message="PDF retrieved successfully.",
        )
    except Exception as e:
        logger.error(f"Failed to read/encode PDF '{clean_name}' for job {job_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load PDF file: {e}",
        )
