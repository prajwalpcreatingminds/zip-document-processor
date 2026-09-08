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
  total_files?: number;
  word_files: number;
  word_file_list: string[];
  existing_pdf_files: number;
  existing_pdf_list: string[];
  other_files?: number;
  other_file_list?: string[];
  unsupported_files: number;
  unsupported_file_list: string[];
  word_folder: string;
  pdf_folder: string;
  other_folder?: string | null;
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

export type FolderMode = "SAME" | "DIFFERENT";

export interface BatchJobInfo {
  job_id: string;
  folder_name: string;
  original_zip: string;
  file_size_bytes: number;
  order: number;
}

export interface BatchUploadResponse {
  success: boolean;
  batch_id: string;
  total_jobs: number;
  jobs: BatchJobInfo[];
  message: string;
}

export interface BatchStatusResponse {
  batch_id: string;
  total_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  is_finished: boolean;
  jobs: JobStatusResponse[];
}

export interface BatchJobItem {
  id: string;
  file: File;
  folderName: string;
  order: number;
  jobId?: string;
  status: "PENDING" | "EXTRACTING" | "EXTRACTED" | "CONVERTING" | "COMPLETED" | "FINISHED_NO_CONVERSION" | "FAILED";
  extractionResult?: ExtractionResponse | null;
  conversionResult?: ConversionResponse | null;
  errorMessage?: string | null;
}

export interface UnfinishedJobItem {
  job_id: string;
  batch_id?: string | null;
  folder_name: string;
  original_archive_name: string;
  archive_format?: string | null;
  stage: string;
  step: number;
  is_unfinished: boolean;
  user_saved: boolean;
  total_files: number;
  word_files_count: number;
  converted_count: number;
  failed_count: number;
  error_message?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface UnfinishedJobsResponse {
  success: boolean;
  total: number;
  jobs: UnfinishedJobItem[];
}

export interface ResumeJobResponse {
  success: boolean;
  job_id: string;
  batch_id?: string | null;
  folder_name: string;
  original_archive_name: string;
  stage: string;
  step: number;
  target_route: string;
  extraction_summary?: ExtractionResponse | null;
  converted_count: number;
  total_to_convert: number;
  message: string;
}

export interface SaveExitRequest {
  job_id: string;
  folder_name?: string | null;
  step?: number | null;
}

export interface PdfViewRequest {
  job_id: string;
  filename: string;
}

export interface PdfViewResponse {
  success: boolean;
  job_id: string;
  filename: string;
  base64_data: string;
  mime_type: string;
  size_bytes: number;
  message: string;
}



