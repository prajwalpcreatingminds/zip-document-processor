from pathlib import Path
from typing import Any
from app.utils.security import sanitize_filename, get_unique_destination_path

WORD_EXTENSIONS = {".doc", ".docx"}
PDF_EXTENSIONS = {".pdf"}


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
        Returns 'WORD', 'PDF', or 'UNSUPPORTED'
        """
        ext = DocumentService.get_extension(filename)
        if ext in WORD_EXTENSIONS:
            return "WORD"
        elif ext in PDF_EXTENSIONS:
            return "PDF"
        else:
            return "UNSUPPORTED"

    @staticmethod
    def get_folder_summary(parent_folder: Path) -> dict[str, Any]:
        """
        Inspects the parent folder structure and counts Word, PDF, and other files.
        """
        word_dir = parent_folder / "Word"
        pdf_dir = parent_folder / "PDF"

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

        return {
            "word_files": word_files,
            "word_count": len(word_files),
            "pdf_files": pdf_files,
            "pdf_count": len(pdf_files),
        }

    @staticmethod
    def build_file_tree(parent_folder: Path) -> dict[str, Any]:
        """
        Constructs a JSON-serializable directory tree for frontend display.
        """
        tree: dict[str, Any] = {
            "name": parent_folder.name,
            "type": "folder",
            "children": []
        }

        if not parent_folder.exists():
            return tree

        for item in sorted(parent_folder.iterdir()):
            if item.is_dir():
                sub_tree = {
                    "name": item.name,
                    "type": "folder",
                    "children": [
                        {"name": f.name, "type": "file", "size": f.stat().st_size}
                        for f in sorted(item.iterdir()) if f.is_file()
                    ]
                }
                tree["children"].append(sub_tree)
            elif item.is_file():
                tree["children"].append({
                    "name": item.name,
                    "type": "file",
                    "size": item.stat().st_size
                })

        return tree
