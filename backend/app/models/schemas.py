from datetime import datetime, timezone
from typing import Any, Optional
from pydantic import BaseModel, Field


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
    total_supported_files: int
    word_files: int
    word_file_list: list[str] = []
    existing_pdf_files: int
    existing_pdf_list: list[str] = []
    unsupported_files: int
    unsupported_file_list: list[str] = []
    word_folder: str
    pdf_folder: str
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


class ConversionRecordModel(BaseModel):
    id: Optional[str] = None
    job_id: str
    word_file_name: str
    pdf_file_name: Optional[str] = None
    source_folder: str
    converted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    conversion_status: str  # "SUCCESS" | "FAILED"
    error_message: Optional[str] = None
    duration_seconds: Optional[float] = None
