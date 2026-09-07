export type JobStage =
  | "UPLOAD"
  | "FOLDER_NAME"
  | "CONFIRM_EXTRACTION"
  | "EXTRACTING"
  | "EXTRACTION_RESULT"
  | "CONVERSION_CONFIRMATION"
  | "CONVERTING"
  | "FINAL_RESULT"
  | "FINISHED_NO_CONVERSION"
  | "ERROR";

export interface UploadResponse {
  success: boolean;
  job_id: string;
  folder_name: string;
  original_zip: string;
  message: string;
}

export interface ExtractionResponse {
  success: boolean;
  job_id: string;
  folder_name: string;
  original_zip: string;
  total_supported_files: number;
  word_files: number;
  word_file_list: string[];
  existing_pdf_files: number;
  existing_pdf_list: string[];
  unsupported_files: number;
  unsupported_file_list: string[];
  word_folder: string;
  pdf_folder: string;
  message: string;
}

export interface ConversionFileResult {
  word_filename: string;
  pdf_filename?: string | null;
  status: "SUCCESS" | "FAILED";
  error_message?: string | null;
  duration_seconds?: number | null;
}

export interface FileTreeNode {
  name: string;
  type: "folder" | "file";
  size?: number;
  children?: FileTreeNode[];
}

export interface ConversionResponse {
  success: boolean;
  job_id: string;
  folder_name: string;
  word_files_found: number;
  successfully_converted: number;
  failed_files_count: number;
  failed_files: ConversionFileResult[];
  converted_files: ConversionFileResult[];
  existing_pdf_count: number;
  converted_pdf_count: number;
  total_pdf_count: number;
  word_folder: string;
  pdf_folder: string;
  file_tree?: FileTreeNode;
  message: string;
}

export interface JobStatusResponse {
  job_id: string;
  folder_name: string;
  stage: string;
  current_file?: string | null;
  current_index: number;
  total_to_convert: number;
  converted_count: number;
  failed_count: number;
  error_message?: string | null;
  extraction_summary?: ExtractionResponse | null;
  conversion_summary?: ConversionResponse | null;
}

export interface ConversionRecord {
  _id: string;
  jobId: string;
  wordFileName: string;
  pdfFileName?: string | null;
  sourceFolder: string;
  convertedAt: string;
  conversionStatus: "SUCCESS" | "FAILED";
  errorMessage?: string | null;
  durationSeconds?: number | null;
}
