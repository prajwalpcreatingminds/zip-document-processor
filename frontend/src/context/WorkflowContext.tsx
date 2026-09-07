"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  ConversionResponse,
  ExtractionResponse,
  JobStatusResponse,
} from "@/types";
import {
  convertWordDocuments,
  extractZip,
  finishWithoutConversion,
  getJobStatus,
  uploadZip,
} from "@/services/api";

export interface WorkflowContextType {
  // Step & Routing
  currentStep: number;
  // State
  file: File | null;
  folderName: string;
  jobId: string | null;
  extractionResult: ExtractionResponse | null;
  conversionResult: ConversionResponse | null;
  jobStatus: JobStatusResponse | null;
  convertDecision: "YES" | "NO" | null;
  isExtracting: boolean;
  isConverting: boolean;
  error: string | null;
  // Actions
  setFile: (file: File | null) => void;
  setFolderName: (name: string) => void;
  clearError: () => void;
  performExtraction: () => Promise<boolean>;
  chooseConversion: (decision: "YES" | "NO") => Promise<void>;
  performConversion: () => Promise<boolean>;
  resetWorkflow: () => void;
  canAccessStep: (stepNumber: number) => boolean;
}

const WorkflowContext = createContext<WorkflowContextType | undefined>(undefined);

export function WorkflowProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [file, setFileState] = useState<File | null>(null);
  const [folderName, setFolderNameState] = useState<string>("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [extractionResult, setExtractionResult] = useState<ExtractionResponse | null>(null);
  const [conversionResult, setConversionResult] = useState<ConversionResponse | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatusResponse | null>(null);
  const [convertDecision, setConvertDecision] = useState<"YES" | "NO" | null>(null);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Derive current step (1 to 7) from pathname
  const getCurrentStepFromPath = (path: string): number => {
    if (path.startsWith("/upload") || path === "/") return 1;
    if (path.startsWith("/folder")) return 2;
    if (path.startsWith("/confirmation")) return 3;
    if (path.startsWith("/extraction")) return 4;
    if (path.startsWith("/decision")) return 5;
    if (path.startsWith("/conversion")) return 6;
    if (path.startsWith("/summary")) return 7;
    return 1;
  };

  const currentStep = getCurrentStepFromPath(pathname);

  // Cleanup polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const setFile = useCallback((newFile: File | null) => {
    setFileState(newFile);
    if (newFile && !folderName) {
      const defaultName = newFile.name.replace(/\.zip$/i, "").replace(/[-_]+/g, " ");
      setFolderNameState(defaultName);
    }
  }, [folderName]);

  const setFolderName = useCallback((name: string) => {
    setFolderNameState(name);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Check if a step can be accessed to prevent illegal jumping
  const canAccessStep = useCallback((stepNumber: number): boolean => {
    if (stepNumber === 1) return true;
    if (stepNumber === 2) return file !== null;
    if (stepNumber === 3) return file !== null && folderName.trim().length > 0;
    if (stepNumber === 4) return file !== null && folderName.trim().length > 0;
    if (stepNumber === 5) return extractionResult !== null;
    if (stepNumber === 6) return extractionResult !== null && convertDecision === "YES";
    if (stepNumber === 7) return extractionResult !== null;
    return false;
  }, [file, folderName, extractionResult, convertDecision]);

  // Route protection
  useEffect(() => {
    if (pathname === "/history") return; // History page is always accessible

    const step = getCurrentStepFromPath(pathname);
    if (!canAccessStep(step)) {
      // Find the furthest valid step and redirect
      if (extractionResult) {
        if (convertDecision === "YES" && conversionResult) {
          router.replace("/summary");
        } else if (convertDecision === "NO") {
          router.replace("/summary");
        } else {
          router.replace("/decision");
        }
      } else if (file && folderName.trim().length > 0) {
        router.replace("/confirmation");
      } else if (file) {
        router.replace("/folder");
      } else {
        router.replace("/upload");
      }
    }
  }, [pathname, canAccessStep, file, folderName, extractionResult, convertDecision, conversionResult, router]);

  // Perform Step 4: Upload & Extraction
  const performExtraction = useCallback(async (): Promise<boolean> => {
    if (!file || !folderName.trim()) {
      setError("Please select a ZIP file and specify a target folder.");
      return false;
    }

    setIsExtracting(true);
    setError(null);

    try {
      // 1. Upload ZIP
      const uploadRes = await uploadZip(file, folderName.trim());
      setJobId(uploadRes.job_id);

      // 2. Extract and organize files
      const extractRes = await extractZip(uploadRes.job_id);
      setExtractionResult(extractRes);
      setIsExtracting(false);
      return true;
    } catch (err: any) {
      console.error("Extraction error:", err);
      setError(err.message || "Failed to extract ZIP archive.");
      setIsExtracting(false);
      return false;
    }
  }, [file, folderName]);

  // Status Polling for Step 6 (Live conversion progress)
  const startStatusPolling = (activeJobId: string) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = setInterval(async () => {
      try {
        const status = await getJobStatus(activeJobId);
        setJobStatus(status);
        if (status.stage === "COMPLETED" || status.stage === "FAILED") {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        }
      } catch (err) {
        console.error("Polling status error:", err);
      }
    }, 400);
  };

  // Perform Step 6: Conversion
  const performConversion = useCallback(async (): Promise<boolean> => {
    if (!jobId) {
      setError("No active extraction job found to convert.");
      return false;
    }

    setIsConverting(true);
    setError(null);
    startStatusPolling(jobId);

    try {
      const convertRes = await convertWordDocuments(jobId);
      setConversionResult(convertRes);
      setIsConverting(false);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      return true;
    } catch (err: any) {
      console.error("Conversion error:", err);
      setError(err.message || "Failed to convert Word documents to PDF.");
      setIsConverting(false);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      return false;
    }
  }, [jobId]);

  // Step 5 Decision
  const chooseConversion = useCallback(async (decision: "YES" | "NO") => {
    setConvertDecision(decision);
    if (decision === "YES") {
      router.push("/conversion");
    } else {
      if (jobId) {
        try {
          await finishWithoutConversion(jobId);
        } catch (err) {
          console.error("Finish without conversion warning:", err);
        }
      }
      router.push("/summary");
    }
  }, [jobId, router]);

  // Reset all state
  const resetWorkflow = useCallback(() => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    setFileState(null);
    setFolderNameState("");
    setJobId(null);
    setExtractionResult(null);
    setConversionResult(null);
    setJobStatus(null);
    setConvertDecision(null);
    setIsExtracting(false);
    setIsConverting(false);
    setError(null);
    router.push("/upload");
  }, [router]);

  return (
    <WorkflowContext.Provider
      value={{
        currentStep,
        file,
        folderName,
        jobId,
        extractionResult,
        conversionResult,
        jobStatus,
        convertDecision,
        isExtracting,
        isConverting,
        error,
        setFile,
        setFolderName,
        clearError,
        performExtraction,
        chooseConversion,
        performConversion,
        resetWorkflow,
        canAccessStep,
      }}
    >
      {children}
    </WorkflowContext.Provider>
  );
}

export function useWorkflow() {
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error("useWorkflow must be used within a WorkflowProvider");
  }
  return context;
}
