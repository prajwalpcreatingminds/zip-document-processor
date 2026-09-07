import {
  ConversionRecord,
  ConversionResponse,
  ExtractionResponse,
  FileTreeNode,
  JobStatusResponse,
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
