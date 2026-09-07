import os
import re
from pathlib import Path

# Windows reserved device names that cannot be used as folder/file names
RESERVED_WINDOWS_NAMES = {
    "CON", "PRN", "AUX", "NUL",
    "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9",
    "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9"
}

# Regex to strip invalid Windows and path traversal characters
INVALID_CHARS_REGEX = re.compile(r'[<>:"/\\|?*\x00-\x1f]')


def sanitize_folder_name(name: str) -> str:
    """
    Sanitizes user-provided folder name:
    - Removes path separators and illegal filesystem characters.
    - Prevents traversal (..).
    - Prevents Windows reserved device names.
    - Trims whitespace and trailing dots/underscores.
    """
    if not name or not name.strip():
        raise ValueError("Folder name cannot be empty.")

    # Extract base name if any path separators were provided
    raw_name = name.strip().replace("\\", "/").split("/")[-1]
    if not raw_name or raw_name in {".", ".."}:
        # If traversal only was provided, extract non-traversal part
        parts = [p for p in name.strip().replace("\\", "/").split("/") if p and p not in {".", ".."}]
        raw_name = "_".join(parts) if parts else "unnamed_folder"

    clean_name = INVALID_CHARS_REGEX.sub("_", raw_name)
    clean_name = re.sub(r"[_\.\s]+", " ", clean_name).strip(". _")

    if not clean_name:
        raise ValueError("Invalid folder name provided.")

    # Check for reserved Windows filenames (e.g. CON, PRN, etc.)
    base_check = clean_name.split(".")[0].upper()
    if base_check in RESERVED_WINDOWS_NAMES:
        clean_name = f"{clean_name}_folder"

    # Enforce maximum length
    if len(clean_name) > 100:
        clean_name = clean_name[:100].rstrip(". _")

    return clean_name


def is_safe_path(base_dir: Path, target_path: Path) -> bool:
    """
    Validates that target_path is strictly within base_dir.
    Guards against Zip Slip and directory traversal.
    """
    try:
        resolved_base = base_dir.resolve()
        resolved_target = target_path.resolve()
        return resolved_base == resolved_target or resolved_base in resolved_target.parents
    except Exception:
        return False


def sanitize_filename(filename: str) -> str:
    """
    Sanitizes extracted file name (removes directory components and illegal characters).
    """
    # Extract only the base name
    base_name = os.path.basename(filename.replace("\\", "/"))
    clean_name = INVALID_CHARS_REGEX.sub("_", base_name).strip()
    return clean_name or "unnamed_file"


def get_unique_destination_path(target_dir: Path, filename: str) -> Path:
    """
    Generates a unique path in target_dir if a file with the same name already exists.
    e.g. 'report.docx' -> 'report_1.docx', 'report_2.docx'
    """
    clean_name = sanitize_filename(filename)
    target_path = target_dir / clean_name
    
    if not target_path.exists():
        return target_path

    stem = target_path.stem
    suffix = target_path.suffix
    counter = 1

    while True:
        candidate = target_dir / f"{stem}_{counter}{suffix}"
        if not candidate.exists():
            return candidate
        counter += 1
