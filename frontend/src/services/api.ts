import {
  BatchStatusResponse,
  BatchUploadResponse,
  ConversionRecord,
  ConversionResponse,
  ExtractionResponse,
  FileTreeNode,
  JobStatusResponse,
  PdfViewResponse,
  ResumeJobResponse,
  SaveExitRequest,
  UnfinishedJobsResponse,
  UploadResponse,
} from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

export async function uploadZip(file: File, folderName: string): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder_name", folderName);

  const res = await fetch(`${API_BASE_URL}/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to upload ZIP file." }));
    throw new Error(errorData.detail || "Upload failed");
  }

  return res.json();
}

export async function uploadBatchArchives(
  files: File[],
  folderMode: "SAME" | "DIFFERENT",
  folderName?: string,
  folderMap?: Record<string, string>
): Promise<BatchUploadResponse> {
  const formData = new FormData();
  files.forEach((f) => formData.append("files", f));
  formData.append("folder_mode", folderMode);
  if (folderName) formData.append("folder_name", folderName);
  if (folderMap) formData.append("folder_map_json", JSON.stringify(folderMap));

  const res = await fetch(`${API_BASE_URL}/batch/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to upload batch archives." }));
    throw new Error(errorData.detail || "Batch upload failed");
  }

  return res.json();
}

export async function getBatchStatus(batchId: string): Promise<BatchStatusResponse> {
  const res = await fetch(`${API_BASE_URL}/batch/status/${batchId}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch batch status");
  }

  return res.json();
}

export async function extractZip(jobId: string): Promise<ExtractionResponse> {
  const res = await fetch(`${API_BASE_URL}/extract`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ job_id: jobId }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to extract ZIP file." }));
    throw new Error(errorData.detail || "Extraction failed");
  }

  return res.json();
}

export async function convertWordDocuments(jobId: string): Promise<ConversionResponse> {
  const res = await fetch(`${API_BASE_URL}/convert`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ job_id: jobId }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to convert documents." }));
    throw new Error(errorData.detail || "Conversion failed");
  }

  return res.json();
}

export async function finishWithoutConversion(jobId: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE_URL}/finish-without-conversion`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ job_id: jobId }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to finalize job." }));
    throw new Error(errorData.detail || "Operation failed");
  }

  return res.json();
}

export async function getJobStatus(jobId: string): Promise<JobStatusResponse> {
  const res = await fetch(`${API_BASE_URL}/status/${jobId}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch job status");
  }

  return res.json();
}

export async function getConversionHistory(
  folderName?: string,
  status?: string
): Promise<{ success: boolean; count: number; records: ConversionRecord[] }> {
  const params = new URLSearchParams();
  if (folderName) params.append("folder_name", folderName);
  if (status) params.append("status", status);

  const url = `${API_BASE_URL}/history${params.toString() ? `?${params.toString()}` : ""}`;
  const res = await fetch(url, { cache: "no-store" });

  if (!res.ok) {
    throw new Error("Failed to fetch conversion history");
  }

  return res.json();
}

export async function getFileTree(jobId: string): Promise<{ success: boolean; file_tree: FileTreeNode }> {
  const res = await fetch(`${API_BASE_URL}/file-tree/${jobId}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch file tree");
  }

  return res.json();
}

export async function getUnfinishedJobs(): Promise<UnfinishedJobsResponse> {
  const res = await fetch(`${API_BASE_URL}/jobs/unfinished`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch unfinished jobs");
  }

  return res.json();
}

export async function resumeJob(jobId: string): Promise<ResumeJobResponse> {
  const res = await fetch(`${API_BASE_URL}/jobs/resume/${jobId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to resume job." }));
    throw new Error(errorData.detail || "Failed to resume job");
  }

  return res.json();
}

export async function saveAndExitJob(
  jobId: string,
  folderName?: string,
  step?: number
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE_URL}/jobs/save-exit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ job_id: jobId, folder_name: folderName, step }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to save job state." }));
    throw new Error(errorData.detail || "Failed to save job state");
  }

  return res.json();
}

export async function discardJob(jobId: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE_URL}/jobs/discard/${jobId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to discard job." }));
    throw new Error(errorData.detail || "Failed to discard job");
  }

  return res.json();
}

export async function viewPdf(jobId: string, filename: string): Promise<PdfViewResponse> {
  const res = await fetch(`${API_BASE_URL}/pdf/view`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ job_id: jobId, filename }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to load PDF preview." }));
    throw new Error(errorData.detail || "Failed to load PDF preview");
  }

  return res.json();
}


