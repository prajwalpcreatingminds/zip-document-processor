from pathlib import Path
from typing import Any
from app.utils.security import sanitize_filename, get_unique_destination_path

WORD_EXTENSIONS = {".doc", ".docx"}
PDF_EXTENSIONS = {".pdf"}

IMAGE_EXTENSIONS = {
    ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", ".ico", ".tiff", ".tif"
}
SPREADSHEET_EXTENSIONS = {
    ".xlsx", ".xls", ".csv", ".tsv", ".ods"
}
PRESENTATION_EXTENSIONS = {
    ".pptx", ".ppt", ".odp", ".key"
}
MEDIA_EXTENSIONS = {
    ".mp3", ".wav", ".ogg", ".flac", ".aac", ".m4a", ".mp4", ".avi", ".mkv", ".mov", ".wmv", ".webm"
}
TEXT_DATA_EXTENSIONS = {
    ".txt", ".json", ".xml", ".yaml", ".yml", ".html", ".htm", ".css", ".js", ".jsx",
    ".ts", ".tsx", ".py", ".java", ".c", ".cpp", ".cs", ".go", ".rs", ".sql", ".sh",
    ".bat", ".md", ".log", ".ini", ".cfg", ".toml", ".rtf"
}


class DocumentService:
    @staticmethod
    def get_extension(filename: str) -> str:
        return Path(filename).suffix.lower()

    @staticmethod
    def is_word_file(filename: str) -> bool:
        return DocumentService.get_extension(filename) in WORD_EXTENSIONS

    @staticmethod
    def is_pdf_file(filename: str) -> bool:
        return DocumentService.get_extension(filename) in PDF_EXTENSIONS

    @staticmethod
    def is_supported_file(filename: str) -> bool:
        return DocumentService.is_word_file(filename) or DocumentService.is_pdf_file(filename)

    @staticmethod
    def classify_file(filename: str) -> str:
        """
        Returns 'WORD', 'PDF', or 'OTHER'
        """
        ext = DocumentService.get_extension(filename)
        if ext in WORD_EXTENSIONS:
            return "WORD"
        elif ext in PDF_EXTENSIONS:
            return "PDF"
        else:
            return "OTHER"

    @staticmethod
    def get_other_category(filename: str) -> str:
        """
        Determines organizational subfolder under Other/ for universal file retention.
        """
        ext = DocumentService.get_extension(filename)
        if ext in IMAGE_EXTENSIONS:
            return "Images"
        elif ext in SPREADSHEET_EXTENSIONS:
            return "Spreadsheets"
        elif ext in PRESENTATION_EXTENSIONS:
            return "Presentations"
        elif ext in MEDIA_EXTENSIONS:
            return "Media"
        elif ext in TEXT_DATA_EXTENSIONS:
            return "Text_Data"
        else:
            return "General"

    @staticmethod
    def get_folder_summary(parent_folder: Path) -> dict[str, Any]:
        """
        Inspects the parent folder structure and counts Word, PDF, and other files.
        """
        word_dir = parent_folder / "Word"
        pdf_dir = parent_folder / "PDF"
        other_dir = parent_folder / "Other"

        word_files: list[str] = []
        if word_dir.exists() and word_dir.is_dir():
            word_files = [
                f.name for f in word_dir.iterdir()
                if f.is_file() and DocumentService.is_word_file(f.name)
            ]

        pdf_files: list[str] = []
        if pdf_dir.exists() and pdf_dir.is_dir():
            pdf_files = [
                f.name for f in pdf_dir.iterdir()
                if f.is_file() and DocumentService.is_pdf_file(f.name)
            ]

        other_files: list[str] = []
        if other_dir.exists() and other_dir.is_dir():
            for p in other_dir.rglob("*"):
                if p.is_file():
                    other_files.append(p.name)

        return {
            "word_files": word_files,
            "word_count": len(word_files),
            "pdf_files": pdf_files,
            "pdf_count": len(pdf_files),
            "other_files": other_files,
            "other_count": len(other_files),
        }

    @staticmethod
    def build_file_tree(parent_folder: Path) -> dict[str, Any]:
        """
        Recursively constructs a JSON-serializable directory tree for frontend display.
        """
        def _build_node(path: Path) -> dict[str, Any]:
            if path.is_dir():
                children = [_build_node(child) for child in sorted(path.iterdir())]
                return {
                    "name": path.name,
                    "type": "folder",
                    "children": children
                }
            else:
                return {
                    "name": path.name,
                    "type": "file",
                    "size": path.stat().st_size
                }

        if not parent_folder.exists():
            return {
                "name": parent_folder.name,
                "type": "folder",
                "children": []
            }

        return _build_node(parent_folder)
