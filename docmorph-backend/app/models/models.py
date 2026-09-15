from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, Field


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
