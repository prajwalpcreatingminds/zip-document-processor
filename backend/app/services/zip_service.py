import io
import os
import shutil
import subprocess
import tarfile
import uuid
import zipfile
from pathlib import Path
from typing import Any, Optional

import py7zr
import rarfile

from app.config.settings import settings
from app.services.document_service import DocumentService
from app.utils.logger import logger
from app.utils.security import (
    get_unique_destination_path,
    is_safe_path,
    sanitize_filename,
    sanitize_folder_name,
)

SUPPORTED_ARCHIVE_EXTENSIONS = {
    ".zip",
    ".rar",
    ".7z",
    ".tar",
    ".tgz",
    ".tar.gz",
    ".tar.xz",
}


EXTRA_TOOL_PATHS = [
    r"C:\Program Files (x86)\WinRAR",
    r"C:\Program Files\WinRAR",
    r"C:\Program Files\7-Zip",
    r"C:\Program Files (x86)\7-Zip",
]

# Ensure WinRAR and 7-Zip paths are in os.environ['PATH']
for p in EXTRA_TOOL_PATHS:
    if os.path.exists(p) and p not in os.environ.get("PATH", ""):
        os.environ["PATH"] = p + os.pathsep + os.environ.get("PATH", "")


def _find_unrar_binary() -> Optional[str]:
    """Finds an available tool for RAR extraction (UnRAR, Rar, 7z)."""
    candidates = [
        shutil.which("UnRAR.exe"),
        shutil.which("unrar"),
        shutil.which("7z.exe"),
        shutil.which("7z"),
        shutil.which("7za.exe"),
        shutil.which("7za"),
        shutil.which("Rar.exe"),
        r"C:\Program Files (x86)\WinRAR\UnRAR.exe",
        r"C:\Program Files\WinRAR\UnRAR.exe",
        r"C:\Program Files (x86)\WinRAR\Rar.exe",
        r"C:\Program Files\WinRAR\Rar.exe",
        r"C:\Program Files\7-Zip\7z.exe",
        r"C:\Program Files (x86)\7-Zip\7z.exe",
    ]
    for c in candidates:
        if c and os.path.exists(c):
            return c
    return None


def _configure_rar_tool():
    """Configures rarfile backend tool."""
    tool = _find_unrar_binary()
    if tool:
        tool_name = os.path.basename(tool).lower()
        if "7z" in tool_name:
            rarfile.SEVENZIP_TOOL = tool
            rarfile.UNRAR_TOOL = tool
        else:
            rarfile.UNRAR_TOOL = tool


class ZipService:
    SUPPORTED_EXTENSIONS = SUPPORTED_ARCHIVE_EXTENSIONS

    @staticmethod
    def detect_format_from_bytes(file_path: Path) -> Optional[str]:
        """Detects archive format from file magic bytes."""
        try:
            with open(file_path, "rb") as f:
                head = f.read(10)
            if head.startswith(b"PK\x03\x04"):
                return "ZIP"
            elif head.startswith(b"Rar!\x1a\x07"):
                return "RAR"
            elif head.startswith(b"7z\xbc\xaf\x27\x1c"):
                return "7Z"
            elif head.startswith(b"\x1f\x8b"):
                return "TGZ"
            elif head.startswith(b"\xfd7zXZ\x00"):
                return "TAR_XZ"
            elif tarfile.is_tarfile(file_path):
                return "TAR"
        except Exception:
            pass
        return None

    @staticmethod
    def get_archive_format(filename: str, file_path: Optional[Path] = None) -> Optional[str]:
        """
        Determines the archive format from file magic bytes or filename extension.
        Returns one of: 'TAR_XZ', 'TGZ', 'TAR', 'ZIP', '7Z', 'RAR', or None.
        """
        if file_path and file_path.exists() and file_path.is_file():
            magic_fmt = ZipService.detect_format_from_bytes(file_path)
            if magic_fmt:
                return magic_fmt

        lower = filename.lower()
        if lower.endswith(".tar.xz"):
            return "TAR_XZ"
        elif lower.endswith(".tar.gz") or lower.endswith(".tgz"):
            return "TGZ"
        elif lower.endswith(".tar"):
            return "TAR"
        elif lower.endswith(".zip"):
            return "ZIP"
        elif lower.endswith(".7z"):
            return "7Z"
        elif lower.endswith(".rar"):
            return "RAR"
        return None

    @staticmethod
    def is_supported_archive(filename: str) -> bool:
        lower = filename.lower()
        return (
            lower.endswith(".zip")
            or lower.endswith(".rar")
            or lower.endswith(".7z")
            or lower.endswith(".tar")
            or lower.endswith(".tgz")
            or lower.endswith(".tar.gz")
            or lower.endswith(".tar.xz")
        )

    @staticmethod
    def create_job_folder(folder_name: str) -> Path:
        """
        Sanitizes folder name and creates the parent folder and subdirectories:
        <storage_dir>/<folder_name>/
          ├── Word/
          ├── PDF/
          └── Other/
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
        (parent_dir / "Other").mkdir(parents=True, exist_ok=True)

        return parent_dir

    @staticmethod
    def extract_and_organize_zip(
        zip_file_path: Path,
        parent_dir: Path,
        original_zip_name: str,
    ) -> dict[str, Any]:
        """
        Extracts ALL files from the uploaded archive (.zip, .rar, .7z, .tar, .tgz, .tar.xz).
        - Word documents (.doc, .docx) -> Word/
        - PDF documents (.pdf) -> PDF/
        - Other file formats (images, media, data, text, etc.) -> Other/<Category>/
        Preserves original archive file inside the parent folder.
        Protects against Zip/Tar Slip and path traversal attacks across all formats.
        Handles duplicate filenames cleanly.
        """
        word_dir = parent_dir / "Word"
        pdf_dir = parent_dir / "PDF"
        other_dir = parent_dir / "Other"
        word_dir.mkdir(parents=True, exist_ok=True)
        pdf_dir.mkdir(parents=True, exist_ok=True)
        other_dir.mkdir(parents=True, exist_ok=True)

        # 1. Preserve the original archive in the parent directory
        dest_archive_path = parent_dir / sanitize_filename(original_zip_name)
        if zip_file_path.resolve() != dest_archive_path.resolve():
            shutil.copy2(zip_file_path, dest_archive_path)
            logger.info(f"Preserved original archive at: {dest_archive_path}")

        archive_format = ZipService.get_archive_format(original_zip_name, zip_file_path)
        if not archive_format:
            # Check extension of actual file if original_zip_name has none
            archive_format = ZipService.get_archive_format(zip_file_path.name, zip_file_path)

        if not archive_format:
            raise ValueError(
                f"Unsupported archive format for '{original_zip_name}'. "
                f"Supported formats: .zip, .rar, .7z, .tar, .tgz, .tar.xz"
            )

        word_files: list[str] = []
        existing_pdf_files: list[str] = []
        other_files: list[str] = []

        try:
            if archive_format == "ZIP":
                ZipService._extract_zip(
                    zip_file_path, word_dir, pdf_dir, other_dir, original_zip_name,
                    word_files, existing_pdf_files, other_files
                )
            elif archive_format in {"TAR", "TGZ", "TAR_XZ"}:
                ZipService._extract_tar(
                    zip_file_path, word_dir, pdf_dir, other_dir, original_zip_name,
                    word_files, existing_pdf_files, other_files
                )
            elif archive_format == "7Z":
                ZipService._extract_7z(
                    zip_file_path, word_dir, pdf_dir, other_dir, original_zip_name,
                    word_files, existing_pdf_files, other_files
                )
            elif archive_format == "RAR":
                ZipService._extract_rar(
                    zip_file_path, word_dir, pdf_dir, other_dir, original_zip_name,
                    word_files, existing_pdf_files, other_files
                )
        except ValueError:
            raise
        except Exception as e:
            logger.error(f"Archive extraction failed for '{original_zip_name}': {e}")
            raise ValueError(f"Failed to extract '{original_zip_name}': {e}")

        total_supported = len(word_files) + len(existing_pdf_files)
        total_files = total_supported + len(other_files)

        return {
            "parent_dir": str(parent_dir),
            "folder_name": parent_dir.name,
            "original_zip": dest_archive_path.name,
            "total_supported_files": total_supported,
            "total_files": total_files,
            "word_files": word_files,
            "word_count": len(word_files),
            "existing_pdf_files": existing_pdf_files,
            "existing_pdf_count": len(existing_pdf_files),
            "other_files": other_files,
            "other_count": len(other_files),
            "unsupported_files": other_files,  # backward compatibility alias
            "unsupported_count": len(other_files),
            "word_folder": str(word_dir.relative_to(settings.PROJECT_ROOT) if word_dir.is_relative_to(settings.PROJECT_ROOT) else word_dir),
            "pdf_folder": str(pdf_dir.relative_to(settings.PROJECT_ROOT) if pdf_dir.is_relative_to(settings.PROJECT_ROOT) else pdf_dir),
            "other_folder": str(other_dir.relative_to(settings.PROJECT_ROOT) if other_dir.is_relative_to(settings.PROJECT_ROOT) else other_dir),
        }

    @staticmethod
    def _extract_zip(
        file_path: Path,
        word_dir: Path,
        pdf_dir: Path,
        other_dir: Path,
        original_name: str,
        word_files: list[str],
        existing_pdf_files: list[str],
        other_files: list[str],
    ):
        if not zipfile.is_zipfile(file_path):
            raise ValueError(f"The provided file '{original_name}' is not a valid or readable ZIP archive.")

        with zipfile.ZipFile(file_path, "r") as zf:
            for member in zf.infolist():
                if member.is_dir() or member.filename.endswith("/"):
                    continue

                raw_filename = member.filename
                clean_name = sanitize_filename(raw_filename)

                if "__MACOSX" in raw_filename or clean_name.startswith("._") or clean_name == ".DS_Store":
                    continue

                classification = DocumentService.classify_file(clean_name)

                if classification == "WORD":
                    dest_path = get_unique_destination_path(word_dir, clean_name)
                    if not is_safe_path(word_dir, dest_path):
                        logger.warning(f"Path traversal detected for entry: {raw_filename}")
                        continue
                    with zf.open(member) as src, open(dest_path, "wb") as dst:
                        shutil.copyfileobj(src, dst)
                    word_files.append(dest_path.name)
                    logger.info(f"Extracted Word file: {dest_path.name} -> {word_dir.name}/")

                elif classification == "PDF":
                    dest_path = get_unique_destination_path(pdf_dir, clean_name)
                    if not is_safe_path(pdf_dir, dest_path):
                        logger.warning(f"Path traversal detected for entry: {raw_filename}")
                        continue
                    with zf.open(member) as src, open(dest_path, "wb") as dst:
                        shutil.copyfileobj(src, dst)
                    existing_pdf_files.append(dest_path.name)
                    logger.info(f"Extracted PDF file: {dest_path.name} -> {pdf_dir.name}/")

                else:
                    # Universal File Format: Retain and organize in Other/<Category>/
                    category = DocumentService.get_other_category(clean_name)
                    target_cat_dir = other_dir / category
                    target_cat_dir.mkdir(parents=True, exist_ok=True)
                    dest_path = get_unique_destination_path(target_cat_dir, clean_name)
                    if not is_safe_path(target_cat_dir, dest_path):
                        logger.warning(f"Path traversal detected for Other entry: {raw_filename}")
                        continue
                    with zf.open(member) as src, open(dest_path, "wb") as dst:
                        shutil.copyfileobj(src, dst)
                    other_files.append(f"{category}/{dest_path.name}")
                    logger.info(f"Extracted Other file: {dest_path.name} -> Other/{category}/")

    @staticmethod
    def _extract_tar(
        file_path: Path,
        word_dir: Path,
        pdf_dir: Path,
        other_dir: Path,
        original_name: str,
        word_files: list[str],
        existing_pdf_files: list[str],
        other_files: list[str],
    ):
        if not tarfile.is_tarfile(file_path):
            raise ValueError(f"The provided file '{original_name}' is not a valid or readable TAR archive.")

        with tarfile.open(file_path, "r:*") as tf:
            for member in tf.getmembers():
                if not member.isfile():
                    continue

                raw_filename = member.name
                clean_name = sanitize_filename(raw_filename)

                if "__MACOSX" in raw_filename or clean_name.startswith("._") or clean_name == ".DS_Store":
                    continue

                classification = DocumentService.classify_file(clean_name)

                if classification == "WORD":
                    dest_path = get_unique_destination_path(word_dir, clean_name)
                    if not is_safe_path(word_dir, dest_path):
                        logger.warning(f"Path traversal detected for TAR entry: {raw_filename}")
                        continue
                    src = tf.extractfile(member)
                    if src:
                        with open(dest_path, "wb") as dst:
                            shutil.copyfileobj(src, dst)
                        word_files.append(dest_path.name)
                        logger.info(f"Extracted Word file: {dest_path.name} -> {word_dir.name}/")

                elif classification == "PDF":
                    dest_path = get_unique_destination_path(pdf_dir, clean_name)
                    if not is_safe_path(pdf_dir, dest_path):
                        logger.warning(f"Path traversal detected for TAR entry: {raw_filename}")
                        continue
                    src = tf.extractfile(member)
                    if src:
                        with open(dest_path, "wb") as dst:
                            shutil.copyfileobj(src, dst)
                        existing_pdf_files.append(dest_path.name)
                        logger.info(f"Extracted PDF file: {dest_path.name} -> {pdf_dir.name}/")

                else:
                    category = DocumentService.get_other_category(clean_name)
                    target_cat_dir = other_dir / category
                    target_cat_dir.mkdir(parents=True, exist_ok=True)
                    dest_path = get_unique_destination_path(target_cat_dir, clean_name)
                    if not is_safe_path(target_cat_dir, dest_path):
                        logger.warning(f"Path traversal detected for TAR entry: {raw_filename}")
                        continue
                    src = tf.extractfile(member)
                    if src:
                        with open(dest_path, "wb") as dst:
                            shutil.copyfileobj(src, dst)
                        other_files.append(f"{category}/{dest_path.name}")
                        logger.info(f"Extracted Other file: {dest_path.name} -> Other/{category}/")

    @staticmethod
    def _extract_7z(
        file_path: Path,
        word_dir: Path,
        pdf_dir: Path,
        other_dir: Path,
        original_name: str,
        word_files: list[str],
        existing_pdf_files: list[str],
        other_files: list[str],
    ):
        if not py7zr.is_7zfile(file_path):
            raise ValueError(f"The provided file '{original_name}' is not a valid or readable 7Z archive.")

        temp_extract_dir = settings.TEMP_DIR / f"7z_{uuid.uuid4()}"
        temp_extract_dir.mkdir(parents=True, exist_ok=True)

        try:
            with py7zr.SevenZipFile(file_path, "r") as archive:
                archive.extractall(path=str(temp_extract_dir))

            for root, _, files in os.walk(temp_extract_dir):
                for fname in files:
                    full_path = Path(root) / fname
                    clean_name = sanitize_filename(fname)

                    if "__MACOSX" in str(full_path) or clean_name.startswith("._") or clean_name == ".DS_Store":
                        continue

                    classification = DocumentService.classify_file(clean_name)

                    if classification == "WORD":
                        dest_path = get_unique_destination_path(word_dir, clean_name)
                        if not is_safe_path(word_dir, dest_path):
                            logger.warning(f"Path traversal detected for 7Z entry: {fname}")
                            continue
                        shutil.copy2(full_path, dest_path)
                        word_files.append(dest_path.name)
                        logger.info(f"Extracted Word file: {dest_path.name} -> {word_dir.name}/")

                    elif classification == "PDF":
                        dest_path = get_unique_destination_path(pdf_dir, clean_name)
                        if not is_safe_path(pdf_dir, dest_path):
                            logger.warning(f"Path traversal detected for 7Z entry: {fname}")
                            continue
                        shutil.copy2(full_path, dest_path)
                        existing_pdf_files.append(dest_path.name)
                        logger.info(f"Extracted PDF file: {dest_path.name} -> {pdf_dir.name}/")

                    else:
                        category = DocumentService.get_other_category(clean_name)
                        target_cat_dir = other_dir / category
                        target_cat_dir.mkdir(parents=True, exist_ok=True)
                        dest_path = get_unique_destination_path(target_cat_dir, clean_name)
                        if not is_safe_path(target_cat_dir, dest_path):
                            logger.warning(f"Path traversal detected for 7Z entry: {fname}")
                            continue
                        shutil.copy2(full_path, dest_path)
                        other_files.append(f"{category}/{dest_path.name}")
                        logger.info(f"Extracted Other file: {dest_path.name} -> Other/{category}/")
        finally:
            shutil.rmtree(temp_extract_dir, ignore_errors=True)

    @staticmethod
    def _extract_rar(
        file_path: Path,
        word_dir: Path,
        pdf_dir: Path,
        other_dir: Path,
        original_name: str,
        word_files: list[str],
        existing_pdf_files: list[str],
        other_files: list[str],
    ):
        _configure_rar_tool()

        temp_extract_dir = settings.TEMP_DIR / f"rar_{uuid.uuid4()}"
        temp_extract_dir.mkdir(parents=True, exist_ok=True)

        extracted_ok = False
        try:
            # 1. Attempt extraction via rarfile library
            if rarfile.is_rarfile(str(file_path)):
                try:
                    with rarfile.RarFile(str(file_path), "r") as rf:
                        rf.extractall(path=str(temp_extract_dir))
                        extracted_ok = True
                except Exception as e:
                    logger.warning(f"rarfile extractall failed, trying native CLI fallback: {e}")

            # 2. Fallback to native UnRAR / Rar / 7z binary if rarfile failed
            if not extracted_ok:
                tool = _find_unrar_binary()
                if tool:
                    tool_name = os.path.basename(tool).lower()
                    if "7z" in tool_name:
                        cmd = [tool, "x", "-y", f"-o{temp_extract_dir}", str(file_path)]
                    else:
                        dest_param = str(temp_extract_dir) + (os.sep if not str(temp_extract_dir).endswith(os.sep) else "")
                        cmd = [tool, "x", "-y", str(file_path), dest_param]

                    res = subprocess.run(cmd, capture_output=True, text=True)
                    if res.returncode == 0:
                        extracted_ok = True
                    else:
                        logger.warning(f"Native tool extraction returned code {res.returncode}: {res.stdout or res.stderr}")

            if not extracted_ok:
                raise ValueError(
                    f"The provided file '{original_name}' is not a valid RAR archive or cannot be extracted."
                )

            # Process extracted files with standard security and classification
            for root, _, files in os.walk(temp_extract_dir):
                for fname in files:
                    full_path = Path(root) / fname
                    clean_name = sanitize_filename(fname)

                    if "__MACOSX" in str(full_path) or clean_name.startswith("._") or clean_name == ".DS_Store":
                        continue

                    classification = DocumentService.classify_file(clean_name)

                    if classification == "WORD":
                        dest_path = get_unique_destination_path(word_dir, clean_name)
                        if not is_safe_path(word_dir, dest_path):
                            logger.warning(f"Path traversal detected for RAR entry: {fname}")
                            continue
                        shutil.copy2(full_path, dest_path)
                        word_files.append(dest_path.name)
                        logger.info(f"Extracted Word file: {dest_path.name} -> {word_dir.name}/")

                    elif classification == "PDF":
                        dest_path = get_unique_destination_path(pdf_dir, clean_name)
                        if not is_safe_path(pdf_dir, dest_path):
                            logger.warning(f"Path traversal detected for RAR entry: {fname}")
                            continue
                        shutil.copy2(full_path, dest_path)
                        existing_pdf_files.append(dest_path.name)
                        logger.info(f"Extracted PDF file: {dest_path.name} -> {pdf_dir.name}/")

                    else:
                        category = DocumentService.get_other_category(clean_name)
                        target_cat_dir = other_dir / category
                        target_cat_dir.mkdir(parents=True, exist_ok=True)
                        dest_path = get_unique_destination_path(target_cat_dir, clean_name)
                        if not is_safe_path(target_cat_dir, dest_path):
                            logger.warning(f"Path traversal detected for RAR entry: {fname}")
                            continue
                        shutil.copy2(full_path, dest_path)
                        other_files.append(f"{category}/{dest_path.name}")
                        logger.info(f"Extracted Other file: {dest_path.name} -> Other/{category}/")
        finally:
            shutil.rmtree(temp_extract_dir, ignore_errors=True)

