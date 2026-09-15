from typing import Any, Optional
from pydantic import BaseModel


class UploadResponse(BaseModel):
    success: bool = True
    job_id: str
    folder_name: str
    original_zip: str
    message: str = "ZIP file uploaded and staged successfully."


class ExtractRequest(BaseModel):
    job_id: str


class ExtractionResponse(BaseModel):
    success: bool = True
    job_id: str
    folder_name: str
    original_zip: str
    total_supported_files: int = 0
    total_files: int = 0
    word_files: int
    word_file_list: list[str] = []
    existing_pdf_files: int
    existing_pdf_list: list[str] = []
    other_files: int = 0
    other_file_list: list[str] = []
    unsupported_files: int = 0
    unsupported_file_list: list[str] = []
    word_folder: str
    pdf_folder: str
    other_folder: Optional[str] = None
    message: str = "Files extracted and organized successfully."


class ConvertRequest(BaseModel):
    job_id: str


class ConversionFileResult(BaseModel):
    word_filename: str
    pdf_filename: Optional[str] = None
    status: str  # "SUCCESS" | "FAILED"
    error_message: Optional[str] = None
    duration_seconds: Optional[float] = None


class ConversionResponse(BaseModel):
    success: bool = True
    job_id: str
    folder_name: str
    word_files_found: int
    successfully_converted: int
    failed_files_count: int
    failed_files: list[ConversionFileResult] = []
    converted_files: list[ConversionFileResult] = []
    existing_pdf_count: int
    converted_pdf_count: int
    total_pdf_count: int
    word_folder: str
    pdf_folder: str
    file_tree: Optional[dict[str, Any]] = None
    message: str = "Conversion process finished."


class JobStatusResponse(BaseModel):
    job_id: str
    folder_name: str
    stage: str  # "UPLOADED", "EXTRACTED", "CONVERTING", "COMPLETED", "FINISHED_NO_CONVERSION", "FAILED"
    current_file: Optional[str] = None
    current_index: int = 0
    total_to_convert: int = 0
    converted_count: int = 0
    failed_count: int = 0
    error_message: Optional[str] = None
    extraction_summary: Optional[ExtractionResponse] = None
    conversion_summary: Optional[ConversionResponse] = None


class BatchJobInfo(BaseModel):
    job_id: str
    folder_name: str
    original_zip: str
    filename: Optional[str] = None
    file_size_bytes: int = 0
    order: int = 1


class BatchUploadResponse(BaseModel):
    success: bool = True
    batch_id: str
    total_jobs: int
    jobs: list[BatchJobInfo]
    message: str = "Batch archives uploaded and staged successfully."


class BatchStatusResponse(BaseModel):
    batch_id: str
    total_jobs: int
    completed_jobs: int
    failed_jobs: int
    is_finished: bool
    jobs: list[JobStatusResponse]


class UnfinishedJobItem(BaseModel):
    job_id: str
    batch_id: Optional[str] = None
    folder_name: str
    original_archive_name: str
    archive_format: Optional[str] = None
    stage: str
    step: int = 1
    is_unfinished: bool = True
    user_saved: bool = False
    total_files: int = 0
    word_files_count: int = 0
    converted_count: int = 0
    failed_count: int = 0
    error_message: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class UnfinishedJobsResponse(BaseModel):
    success: bool = True
    total: int = 0
    jobs: list[UnfinishedJobItem] = []


class ResumeJobResponse(BaseModel):
    success: bool = True
    job_id: str
    batch_id: Optional[str] = None
    folder_name: str
    original_archive_name: str
    stage: str
    step: int
    target_route: str
    extraction_summary: Optional[ExtractionResponse] = None
    conversion_summary: Optional[ConversionResponse] = None
    converted_count: int = 0
    total_to_convert: int = 0
    message: str = "Job recovered and resumed successfully."


class SaveExitRequest(BaseModel):
    job_id: str
    folder_name: Optional[str] = None
    step: Optional[int] = None


class PdfViewRequest(BaseModel):
    job_id: str
    filename: str


class PdfViewResponse(BaseModel):
    success: bool = True
    job_id: str
    filename: str
    base64_data: str
    mime_type: str = "application/pdf"
    size_bytes: int
    message: str = "PDF retrieved successfully."
