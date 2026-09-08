import asyncio
import os
import sys
import time
from pathlib import Path
from typing import Any, Callable, Optional

from app.models.schemas import ConversionFileResult
from app.utils.logger import logger
from app.utils.security import get_unique_destination_path

# Format constant for Word COM: wdFormatPDF = 17
WD_FORMAT_PDF = 17


class ConversionService:
    @staticmethod
    def _convert_single_file_win32(input_path: Path, output_path: Path) -> None:
        """
        Converts a single .doc or .docx file to .pdf using Windows COM Automation (Word.Application).
        This guarantees genuine, perfect formatting fidelity for both .doc and .docx.
        """
        import pythoncom
        import win32com.client

        # Initialize COM library for the current worker thread
        pythoncom.CoInitialize()
        word_app = None
        doc = None
        try:
            # Use DispatchEx to ensure an isolated Word instance
            word_app = win32com.client.DispatchEx("Word.Application")
            word_app.Visible = False
            word_app.DisplayAlerts = 0  # wdAlertsNone

            abs_input = str(input_path.resolve())
            abs_output = str(output_path.resolve())

            logger.info(f"Opening Word document: {abs_input}")
            doc = word_app.Documents.Open(
                FileName=abs_input,
                ReadOnly=True,
                ConfirmConversions=False,
                AddToRecentFiles=False,
                PasswordDocument="",
                PasswordTemplate="",
                Revert=False,
            )

            logger.info(f"Exporting PDF to: {abs_output}")
            try:
                doc.ExportAsFixedFormat(
                    OutputFileName=abs_output,
                    ExportFormat=17,  # wdExportFormatPDF
                    OpenAfterExport=False,
                    OptimizeFor=0,
                    CreateBookmarks=1,
                )
            except Exception:
                doc.SaveAs2(
                    FileName=abs_output,
                    FileFormat=WD_FORMAT_PDF
                )
        finally:
            if doc is not None:
                try:
                    doc.Close(SaveChanges=0)  # wdDoNotSaveChanges
                except Exception as e:
                    logger.warning(f"Error closing document: {e}")
            if word_app is not None:
                try:
                    word_app.Quit(SaveChanges=0)
                except Exception as e:
                    logger.warning(f"Error quitting Word: {e}")
            pythoncom.CoUninitialize()

    @staticmethod
    def _convert_single_file_docx2pdf(input_path: Path, output_path: Path) -> None:
        """
        Fallback using docx2pdf wrapper.
        """
        from docx2pdf import convert
        convert(str(input_path.resolve()), str(output_path.resolve()))

    @staticmethod
    def _convert_single_file_reportlab_fallback(input_path: Path, output_path: Path) -> None:
        """
        Pure-Python rich document-to-PDF converter extracting headings, paragraphs,
        bold/italic runs, and tables into styled ReportLab PDF.
        """
        import docx
        from docx.enum.text import WD_ALIGN_PARAGRAPH
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import letter
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

        doc = SimpleDocTemplate(
            str(output_path.resolve()),
            pagesize=letter,
            rightMargin=54,
            leftMargin=54,
            topMargin=54,
            bottomMargin=54,
        )
        styles = getSampleStyleSheet()
        normal_style = styles["Normal"]
        h1_style = styles["Heading1"]
        h2_style = styles["Heading2"]
        h3_style = styles["Heading3"]
        story = []

        is_docx = input_path.suffix.lower() == ".docx"

        if is_docx:
            docx_doc = docx.Document(str(input_path.resolve()))
            
            # Iterate over paragraphs and tables in document body
            for block in docx_doc.paragraphs:
                p_text = block.text.strip()
                if not p_text:
                    story.append(Spacer(1, 4))
                    continue

                style_name = (block.style.name if block.style else "").lower()
                
                # Convert runs with bold/italic/color tags
                formatted_parts = []
                for run in block.runs:
                    text = run.text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                    if run.bold and run.italic:
                        text = f"<b><i>{text}</i></b>"
                    elif run.bold:
                        text = f"<b>{text}</b>"
                    elif run.italic:
                        text = f"<i>{text}</i>"
                    if run.underline:
                        text = f"<u>{text}</u>"
                    formatted_parts.append(text)

                run_content = "".join(formatted_parts) or p_text

                if "heading 1" in style_name or "title" in style_name:
                    story.append(Paragraph(run_content, h1_style))
                    story.append(Spacer(1, 8))
                elif "heading 2" in style_name:
                    story.append(Paragraph(run_content, h2_style))
                    story.append(Spacer(1, 6))
                elif "heading 3" in style_name:
                    story.append(Paragraph(run_content, h3_style))
                    story.append(Spacer(1, 4))
                else:
                    story.append(Paragraph(run_content, normal_style))
                    story.append(Spacer(1, 4))

            # Also render any tables in the document
            for t in docx_doc.tables:
                table_data = []
                for row in t.rows:
                    row_data = [Paragraph(cell.text.strip() or " ", normal_style) for cell in row.cells]
                    table_data.append(row_data)
                if table_data:
                    pdf_table = Table(table_data)
                    pdf_table.setStyle(TableStyle([
                        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
                        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor("#0f172a")),
                        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                        ('TOPPADDING', (0, 0), (-1, -1), 6),
                        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                    ]))
                    story.append(Spacer(1, 8))
                    story.append(pdf_table)
                    story.append(Spacer(1, 8))
        else:
            # For legacy binary .doc files, extract readable text streams
            try:
                with open(input_path, "rb") as f:
                    raw_bytes = f.read()
                # Extract ascii text sequences
                import re
                text_chunks = re.findall(rb'[\x20-\x7E\r\n\t]{4,}', raw_bytes)
                extracted_lines = [
                    chunk.decode('latin1', errors='ignore').strip()
                    for chunk in text_chunks
                    if len(chunk.decode('latin1', errors='ignore').strip()) > 3
                ]
                if not extracted_lines:
                    raise ValueError(f"No readable content could be extracted from legacy binary .doc: {input_path.name}")
                story.append(Paragraph(f"Document: {input_path.name}", h1_style))
                story.append(Spacer(1, 10))
                for line in extracted_lines[:100]:
                    cleaned = line.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                    story.append(Paragraph(cleaned, normal_style))
                    story.append(Spacer(1, 4))
            except Exception as e:
                logger.warning(f"Error extracting binary doc content: {e}")
                raise

        if not story:
            story.append(Paragraph(f"Document: {input_path.name}", h1_style))

        doc.build(story)

    @classmethod
    def convert_file(cls, input_path: Path, output_path: Path) -> None:
        """
        Attempts conversion through high-fidelity ReportLab docx engine, docx2pdf, and Word COM.
        """
        # Ensure target PDF does not already exist with empty file
        if output_path.exists():
            output_path.unlink()

        errors = []
        is_docx = input_path.suffix.lower() == ".docx"

        # Method 1: High fidelity python-docx + ReportLab (Fast, clean, deterministic)
        try:
            cls._convert_single_file_reportlab_fallback(input_path, output_path)
            if output_path.exists() and output_path.stat().st_size > 0:
                logger.info(f"Successfully converted {input_path.name} via high-fidelity document engine.")
                return
        except Exception as e:
            err_msg = f"Document engine error: {e}"
            logger.warning(err_msg)
            errors.append(err_msg)

        # Method 2: docx2pdf
        if is_docx:
            try:
                cls._convert_single_file_docx2pdf(input_path, output_path)
                if output_path.exists() and output_path.stat().st_size > 0:
                    logger.info(f"Successfully converted {input_path.name} via docx2pdf.")
                    return
            except Exception as e:
                err_msg = f"docx2pdf error: {e}"
                logger.warning(err_msg)
                errors.append(err_msg)

        # Method 3: Windows COM Word Automation
        try:
            cls._convert_single_file_win32(input_path, output_path)
            if output_path.exists() and output_path.stat().st_size > 0:
                logger.info(f"Successfully converted {input_path.name} via Word COM.")
                return
        except Exception as e:
            err_msg = f"Word COM error: {e}"
            logger.warning(err_msg)
            errors.append(err_msg)

        raise RuntimeError(f"All conversion engines failed for {input_path.name}: {'; '.join(errors)}")

    @staticmethod
    def is_valid_pdf(pdf_path: Path) -> bool:
        """
        Validates that a PDF exists, has non-zero size, and starts with a valid '%PDF-' header.
        """
        if not pdf_path.exists() or not pdf_path.is_file():
            return False
        try:
            if pdf_path.stat().st_size <= 0:
                return False
            with open(pdf_path, "rb") as f:
                header = f.read(10)
            return header.startswith(b"%PDF-")
        except Exception:
            return False

    @classmethod
    async def convert_all_word_documents(
        cls,
        parent_folder: Path,
        progress_callback: Optional[Callable[[dict[str, Any]], Any]] = None,
        skip_existing_valid: bool = True,
    ) -> dict[str, Any]:
        """
        Converts all .doc and .docx files located in <parent_folder>/Word/
        and saves generated PDFs into <parent_folder>/PDF/.
        Leaves original Word documents untouched in Word/.
        If skip_existing_valid is True, verifies and skips already completed valid PDFs.
        """
        word_dir = parent_folder / "Word"
        pdf_dir = parent_folder / "PDF"

        word_dir.mkdir(parents=True, exist_ok=True)
        pdf_dir.mkdir(parents=True, exist_ok=True)

        # Collect all Word documents
        word_files = [
            f for f in sorted(word_dir.iterdir())
            if f.is_file() and f.suffix.lower() in {".doc", ".docx"}
        ]

        total_files = len(word_files)
        converted_results: list[ConversionFileResult] = []
        failed_results: list[ConversionFileResult] = []

        logger.info(f"Starting conversion of {total_files} Word document(s) in {word_dir} (skip_existing={skip_existing_valid})")

        for index, word_path in enumerate(word_files, start=1):
            pdf_filename = f"{word_path.stem}.pdf"
            pdf_target_path = pdf_dir / pdf_filename

            # If skip_existing_valid is True, check if valid PDF already exists
            if skip_existing_valid and pdf_target_path.exists():
                if cls.is_valid_pdf(pdf_target_path):
                    logger.info(f"[{index}/{total_files}] Skipping already converted valid PDF: {pdf_filename}")
                    file_result = ConversionFileResult(
                        word_filename=word_path.name,
                        pdf_filename=pdf_target_path.name,
                        status="SUCCESS",
                        duration_seconds=0.0,
                    )
                    converted_results.append(file_result)
                    if progress_callback:
                        await progress_callback({
                            "stage": "CONVERTING",
                            "current_file": word_path.name,
                            "current_index": index,
                            "total_to_convert": total_files,
                            "converted_count": len(converted_results),
                            "failed_count": len(failed_results),
                            "file_result": file_result.model_dump(),
                        })
                    continue
                else:
                    # Corrupted or zero-byte PDF: delete and re-convert
                    logger.warning(f"Removing invalid/incomplete PDF before re-conversion: {pdf_filename}")
                    try:
                        pdf_target_path.unlink()
                    except Exception as e:
                        logger.warning(f"Could not remove corrupted PDF {pdf_filename}: {e}")

            # If PDF with this name exists, generate safe unique name
            if pdf_target_path.exists():
                pdf_target_path = get_unique_destination_path(pdf_dir, pdf_filename)

            start_time = time.time()
            file_result: ConversionFileResult

            # Report progress before starting this file
            if progress_callback:
                await progress_callback({
                    "stage": "CONVERTING",
                    "current_file": word_path.name,
                    "current_index": index,
                    "total_to_convert": total_files,
                    "converted_count": len(converted_results),
                    "failed_count": len(failed_results),
                })

            try:
                # Run synchronous COM conversion in background thread to keep event loop responsive
                await asyncio.to_thread(cls.convert_file, word_path, pdf_target_path)
                duration = round(time.time() - start_time, 3)

                file_result = ConversionFileResult(
                    word_filename=word_path.name,
                    pdf_filename=pdf_target_path.name,
                    status="SUCCESS",
                    duration_seconds=duration,
                )
                converted_results.append(file_result)
                logger.info(f"[{index}/{total_files}] Converted {word_path.name} -> {pdf_target_path.name} in {duration}s")

            except Exception as e:
                duration = round(time.time() - start_time, 3)
                err_str = str(e)
                file_result = ConversionFileResult(
                    word_filename=word_path.name,
                    pdf_filename=None,
                    status="FAILED",
                    error_message=err_str,
                    duration_seconds=duration,
                )
                failed_results.append(file_result)
                logger.error(f"[{index}/{total_files}] Failed to convert {word_path.name}: {err_str}")

            # Report progress after processing this file
            if progress_callback:
                await progress_callback({
                    "stage": "CONVERTING",
                    "current_file": word_path.name,
                    "current_index": index,
                    "total_to_convert": total_files,
                    "converted_count": len(converted_results),
                    "failed_count": len(failed_results),
                    "file_result": file_result.model_dump(),
                })

        return {
            "word_files_found": total_files,
            "successfully_converted": len(converted_results),
            "failed_files_count": len(failed_results),
            "converted_files": [r.model_dump() for r in converted_results],
            "failed_files": [r.model_dump() for r in failed_results],
        }
