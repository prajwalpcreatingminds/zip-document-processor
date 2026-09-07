import io
import os
import shutil
import zipfile
from pathlib import Path
from typing import Any

from app.config.settings import settings
from app.services.document_service import DocumentService
from app.utils.logger import logger
from app.utils.security import (
    get_unique_destination_path,
    is_safe_path,
    sanitize_filename,
    sanitize_folder_name,
)


class ZipService:
    @staticmethod
    def create_job_folder(folder_name: str) -> Path:
        """
        Sanitizes folder name and creates the parent folder and subdirectories:
        <storage_dir>/<folder_name>/
          ├── Word/
          └── PDF/
        """
        clean_folder = sanitize_folder_name(folder_name)
        parent_dir = settings.STORAGE_DIR / clean_folder

        # If parent_dir already exists with another run, append unique suffix
        if parent_dir.exists():
            counter = 1
            while (settings.STORAGE_DIR / f"{clean_folder}_{counter}").exists():
                counter += 1
            parent_dir = settings.STORAGE_DIR / f"{clean_folder}_{counter}"

        parent_dir.mkdir(parents=True, exist_ok=True)
        (parent_dir / "Word").mkdir(parents=True, exist_ok=True)
        (parent_dir / "PDF").mkdir(parents=True, exist_ok=True)

        return parent_dir

    @staticmethod
    def extract_and_organize_zip(
        zip_file_path: Path,
        parent_dir: Path,
        original_zip_name: str
    ) -> dict[str, Any]:
        """
        Extracts ALL supported files into Word/ and PDF/ folders.
        Preserves original ZIP inside the parent folder.
        Protects against ZIP Slip / path traversal attacks.
        Handles duplicate filenames cleanly.
        """
        word_dir = parent_dir / "Word"
        pdf_dir = parent_dir / "PDF"

        # 1. Preserve the original ZIP in the parent directory
        dest_zip_path = parent_dir / sanitize_filename(original_zip_name)
        if zip_file_path.resolve() != dest_zip_path.resolve():
            shutil.copy2(zip_file_path, dest_zip_path)
            logger.info(f"Preserved original ZIP at: {dest_zip_path}")

        word_files: list[str] = []
        existing_pdf_files: list[str] = []
        unsupported_files: list[str] = []

        # 2. Open and inspect the ZIP archive
        if not zipfile.is_zipfile(zip_file_path):
            raise ValueError(f"The provided file '{original_zip_name}' is not a valid ZIP archive.")

        with zipfile.ZipFile(zip_file_path, "r") as zf:
            for member in zf.infolist():
                # Skip directories
                if member.is_dir() or member.filename.endswith("/"):
                    continue

                raw_filename = member.filename
                clean_name = sanitize_filename(raw_filename)
                
                # Skip macOS metadata or hidden files like __MACOSX/ or .DS_Store
                if "__MACOSX" in raw_filename or clean_name.startswith("._") or clean_name == ".DS_Store":
                    continue

                classification = DocumentService.classify_file(clean_name)

                if classification == "WORD":
                    dest_path = get_unique_destination_path(word_dir, clean_name)
                    # Safe check against Zip Slip
                    if not is_safe_path(word_dir, dest_path):
                        logger.warning(f"Zip slip attempt detected for entry: {raw_filename}")
                        continue
                    
                    with zf.open(member) as src, open(dest_path, "wb") as dst:
                        shutil.copyfileobj(src, dst)
                    
                    word_files.append(dest_path.name)
                    logger.info(f"Extracted Word file: {dest_path.name} -> {word_dir.name}/")

                elif classification == "PDF":
                    dest_path = get_unique_destination_path(pdf_dir, clean_name)
                    # Safe check against Zip Slip
                    if not is_safe_path(pdf_dir, dest_path):
                        logger.warning(f"Zip slip attempt detected for entry: {raw_filename}")
                        continue

                    with zf.open(member) as src, open(dest_path, "wb") as dst:
                        shutil.copyfileobj(src, dst)

                    existing_pdf_files.append(dest_path.name)
                    logger.info(f"Extracted PDF file: {dest_path.name} -> {pdf_dir.name}/")

                else:
                    unsupported_files.append(clean_name)
                    logger.info(f"Skipped unsupported file: {clean_name}")

        total_supported = len(word_files) + len(existing_pdf_files)

        return {
            "parent_dir": str(parent_dir),
            "folder_name": parent_dir.name,
            "original_zip": dest_zip_path.name,
            "total_supported_files": total_supported,
            "word_files": word_files,
            "word_count": len(word_files),
            "existing_pdf_files": existing_pdf_files,
            "existing_pdf_count": len(existing_pdf_files),
            "unsupported_files": unsupported_files,
            "unsupported_count": len(unsupported_files),
            "word_folder": str(word_dir.relative_to(settings.PROJECT_ROOT) if word_dir.is_relative_to(settings.PROJECT_ROOT) else word_dir),
            "pdf_folder": str(pdf_dir.relative_to(settings.PROJECT_ROOT) if pdf_dir.is_relative_to(settings.PROJECT_ROOT) else pdf_dir),
        }
