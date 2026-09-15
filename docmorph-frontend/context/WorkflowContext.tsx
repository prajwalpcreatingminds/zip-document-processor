"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  ConversionResponse,
  ExtractionResponse,
  JobStatusResponse,
  BatchJobItem,
  BatchJobInfo,
  UnfinishedJobItem,
} from "@/types";
import {
  convertWordDocuments,
  discardJob,
  extractZip,
  finishWithoutConversion,
  getJobStatus,
  getUnfinishedJobs,
  resumeJob,
  saveAndExitJob,
  uploadZip,
  uploadBatchArchives,
} from "@/lib/api";
import { LeaveWorkflowModal } from "@/components/LeaveWorkflowModal";

export interface WorkflowContextType {
  // Step & Routing
  currentStep: number;
  // State
  files: File[];
  file: File | null;
  folderMode: "SAME" | "DIFFERENT";
  folderName: string;
  folderMap: Record<string, string>;
  jobId: string | null;
  batchId: string | null;
  batchJobs: BatchJobItem[];
  activeJobIndex: number;
  extractionResult: ExtractionResponse | null;
  conversionResult: ConversionResponse | null;
  jobStatus: JobStatusResponse | null;
  convertDecision: "YES" | "NO" | null;
  isExtracting: boolean;
  isConverting: boolean;
  error: string | null;
  // Feature 4: Resume & Unfinished Jobs State
  unfinishedJobs: UnfinishedJobItem[];
  isLoadingUnfinished: boolean;
  isLeaveModalOpen: boolean;
  isSavingLeave: boolean;
  // Actions
  setFiles: (files: File[]) => void;
  setFile: (file: File | null) => void;
  addFiles: (files: File[]) => void;
  removeFile: (index: number) => void;
  setFolderMode: (mode: "SAME" | "DIFFERENT") => void;
  setFolderName: (name: string) => void;
  setFolderForFile: (filename: string, folder: string) => void;
  clearError: () => void;
  performExtraction: () => Promise<boolean>;
  chooseConversion: (decision: "YES" | "NO") => Promise<void>;
  performConversion: () => Promise<boolean>;
  resetWorkflow: () => void;
  canAccessStep: (stepNumber: number) => boolean;
  // Feature 4 Actions
  fetchUnfinishedJobs: () => Promise<void>;
  resumeUnfinishedJob: (jobId: string) => Promise<boolean>;
  discardUnfinishedJob: (jobId: string) => Promise<boolean>;
  requestLeaveWorkflow: (targetPath?: string) => void;
  confirmSaveAndExit: () => Promise<void>;
  confirmDontSave: () => Promise<void>;
  cancelLeave: () => void;
  hasActiveUnfinishedWorkflow: () => boolean;
}

const WorkflowContext = createContext<WorkflowContextType | undefined>(undefined);

export function WorkflowProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [files, setFilesState] = useState<File[]>([]);
  const [folderMode, setFolderModeState] = useState<"SAME" | "DIFFERENT">("SAME");
  const [folderName, setFolderNameState] = useState<string>("");
  const [folderMap, setFolderMapState] = useState<Record<string, string>>({});
  const [jobId, setJobId] = useState<string | null>(null);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [batchJobs, setBatchJobs] = useState<BatchJobItem[]>([]);
  const [activeJobIndex, setActiveJobIndex] = useState<number>(0);

  const [extractionResult, setExtractionResult] = useState<ExtractionResponse | null>(null);
  const [conversionResult, setConversionResult] = useState<ConversionResponse | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatusResponse | null>(null);
  const [convertDecision, setConvertDecision] = useState<"YES" | "NO" | null>(null);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [unfinishedJobs, setUnfinishedJobs] = useState<UnfinishedJobItem[]>([]);
  const [isLoadingUnfinished, setIsLoadingUnfinished] = useState<boolean>(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState<boolean>(false);
  const [isSavingLeave, setIsSavingLeave] = useState<boolean>(false);
  const [pendingNavigationUrl, setPendingNavigationUrl] = useState<string | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const file = files.length > 0 ? files[0] : null;

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

  // Fetch unfinished jobs
  const fetchUnfinishedJobs = useCallback(async () => {
    setIsLoadingUnfinished(true);
    try {
      const res = await getUnfinishedJobs();
      setUnfinishedJobs(res.jobs || []);
    } catch (err) {
      console.error("Failed to fetch unfinished jobs:", err);
    } finally {
      setIsLoadingUnfinished(false);
    }
  }, []);

  // Automatically fetch unfinished jobs on mount and path changes to /upload
  useEffect(() => {
    fetchUnfinishedJobs();
  }, [fetchUnfinishedJobs, pathname]);

  // Cleanup polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const setFiles = useCallback((newFiles: File[]) => {
    setFilesState(newFiles);
    if (newFiles.length > 0 && !folderName) {
      const defaultName = newFiles[0].name
        .replace(/(\.tar\.xz|\.tar\.gz|\.tgz|\.tar|\.zip|\.rar|\.7z)$/i, "")
        .replace(/[-_]+/g, " ");
      setFolderNameState(defaultName);
    }
    // Pre-populate folder map for different mode
    const newMap: Record<string, string> = {};
    newFiles.forEach((f) => {
      newMap[f.name] = f.name
        .replace(/(\.tar\.xz|\.tar\.gz|\.tgz|\.tar|\.zip|\.rar|\.7z)$/i, "")
        .replace(/[-_]+/g, " ");
    });
    setFolderMapState((prev) => ({ ...newMap, ...prev }));
  }, [folderName]);

  const setFile = useCallback((singleFile: File | null) => {
    if (singleFile) {
      setFiles([singleFile]);
    } else {
      setFilesState([]);
      setFolderMapState({});
    }
  }, [setFiles]);

  const addFiles = useCallback((newFiles: File[]) => {
    setFilesState((prev) => {
      const combined = [...prev];
      const newMap: Record<string, string> = { ...folderMap };
      newFiles.forEach((nf) => {
        if (!combined.some((f) => f.name === nf.name && f.size === nf.size)) {
          combined.push(nf);
          newMap[nf.name] = nf.name
            .replace(/(\.tar\.xz|\.tar\.gz|\.tgz|\.tar|\.zip|\.rar|\.7z)$/i, "")
            .replace(/[-_]+/g, " ");
        }
      });
      setFolderMapState(newMap);
      if (combined.length > 0 && !folderName) {
        setFolderNameState(
          combined[0].name
            .replace(/(\.tar\.xz|\.tar\.gz|\.tgz|\.tar|\.zip|\.rar|\.7z)$/i, "")
            .replace(/[-_]+/g, " ")
        );
      }
      return combined;
    });
  }, [folderMap, folderName]);

  const removeFile = useCallback((indexToRemove: number) => {
    setFilesState((prev) => prev.filter((_, i) => i !== indexToRemove));
  }, []);

  const setFolderMode = useCallback((mode: "SAME" | "DIFFERENT") => {
    setFolderModeState(mode);
  }, []);

  const setFolderName = useCallback((name: string) => {
    setFolderNameState(name);
  }, []);

  const setFolderForFile = useCallback((filename: string, folder: string) => {
    setFolderMapState((prev) => ({
      ...prev,
      [filename]: folder,
    }));
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Check if a step can be accessed to prevent illegal jumping
  const canAccessStep = useCallback((stepNumber: number): boolean => {
    if (stepNumber === 1) return true;
    if (stepNumber === 2) return files.length > 0;
    if (stepNumber === 3) return files.length > 0 && (folderMode === "DIFFERENT" || folderName.trim().length > 0);
    if (stepNumber === 4) return (files.length > 0 && (folderMode === "DIFFERENT" || folderName.trim().length > 0)) || !!jobId;
    if (stepNumber === 5) return batchJobs.length > 0 || extractionResult !== null || !!jobId;
    if (stepNumber === 6) return (batchJobs.length > 0 || extractionResult !== null || !!jobId) && convertDecision === "YES";
    if (stepNumber === 7) return batchJobs.length > 0 || extractionResult !== null || !!jobId;
    return false;
  }, [files, folderMode, folderName, batchJobs, extractionResult, convertDecision, jobId]);

  // Route protection
  useEffect(() => {
    if (pathname === "/history") return; // History page is always accessible

    const step = getCurrentStepFromPath(pathname);
    if (!canAccessStep(step)) {
      if (batchJobs.length > 0 || extractionResult || jobId) {
        if (convertDecision === "YES" && (conversionResult || batchJobs.some((j) => j.conversionResult))) {
          router.replace("/summary");
        } else if (convertDecision === "NO") {
          router.replace("/summary");
        } else {
          router.replace("/decision");
        }
      } else if (files.length > 0 && (folderMode === "DIFFERENT" || folderName.trim().length > 0)) {
        router.replace("/confirmation");
      } else if (files.length > 0) {
        router.replace("/folder");
      } else {
        router.replace("/upload");
      }
    }
  }, [pathname, canAccessStep, files, folderMode, folderName, batchJobs, extractionResult, convertDecision, conversionResult, jobId, router]);

  // Feature 4: Resume unfinished job
  const resumeUnfinishedJob = useCallback(async (targetJobId: string): Promise<boolean> => {
    setError(null);
    try {
      const res = await resumeJob(targetJobId);
      if (!res.success) {
        setError(res.message || "Failed to resume job.");
        return false;
      }

      setJobId(res.job_id);
      setBatchId(res.batch_id || null);
      setFolderNameState(res.folder_name);

      if (res.extraction_summary) {
        setExtractionResult(res.extraction_summary);
      }

      const syntheticJob: BatchJobItem = {
        id: res.job_id,
        file: new File([], res.original_archive_name),
        folderName: res.folder_name,
        order: 1,
        jobId: res.job_id,
        status: (res.stage as any) || "EXTRACTED",
        extractionResult: res.extraction_summary || null,
        conversionResult: null,
      };
      setBatchJobs([syntheticJob]);
      setActiveJobIndex(0);

      if (res.stage === "CONVERTING" || res.stage === "COMPLETED") {
        setConvertDecision("YES");
      } else if (res.stage === "FINISHED_NO_CONVERSION") {
        setConvertDecision("NO");
      }

      await fetchUnfinishedJobs();
      router.push(res.target_route);
      return true;
    } catch (err: any) {
      console.error("Resume job error:", err);
      setError(err.message || "Could not resume job.");
      return false;
    }
  }, [fetchUnfinishedJobs, router]);

  // Feature 4: Discard unfinished job
  const discardUnfinishedJob = useCallback(async (targetJobId: string): Promise<boolean> => {
    try {
      await discardJob(targetJobId);
      await fetchUnfinishedJobs();
      return true;
    } catch (err: any) {
      console.error("Discard job error:", err);
      setError(err.message || "Could not discard job.");
      return false;
    }
  }, [fetchUnfinishedJobs]);

  // Feature 4: Active workflow detection
  const hasActiveUnfinishedWorkflow = useCallback((): boolean => {
    const step = getCurrentStepFromPath(pathname);
    if (step === 1 && files.length === 0 && !jobId && batchJobs.length === 0) return false;
    if (step === 7) return false;
    return files.length > 0 || !!jobId || batchJobs.length > 0;
  }, [pathname, files, jobId, batchJobs]);

  // Feature 4: Request Leave Modal
  const requestLeaveWorkflow = useCallback((targetPath?: string) => {
    if (hasActiveUnfinishedWorkflow()) {
      setPendingNavigationUrl(targetPath || "/upload");
      setIsLeaveModalOpen(true);
    } else if (targetPath) {
      router.push(targetPath);
    }
  }, [hasActiveUnfinishedWorkflow, router]);

  // Feature 4: Confirm Save & Exit
  const confirmSaveAndExit = useCallback(async () => {
    setIsSavingLeave(true);
    try {
      const jobsToSave = batchJobs.length > 0 ? batchJobs : (jobId ? [{ jobId, folderName }] : []);
      for (const j of jobsToSave) {
        if (j.jobId) {
          await saveAndExitJob(j.jobId, j.folderName || folderName, currentStep);
        }
      }
    } catch (err) {
      console.error("Error during Save & Exit:", err);
    } finally {
      setIsSavingLeave(false);
      setIsLeaveModalOpen(false);
      const destination = pendingNavigationUrl || "/upload";
      setPendingNavigationUrl(null);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      setFilesState([]);
      setFolderModeState("SAME");
      setFolderNameState("");
      setFolderMapState({});
      setJobId(null);
      setBatchId(null);
      setBatchJobs([]);
      setActiveJobIndex(0);
      setExtractionResult(null);
      setConversionResult(null);
      setJobStatus(null);
      setConvertDecision(null);
      setIsExtracting(false);
      setIsConverting(false);
      setError(null);
      await fetchUnfinishedJobs();
      router.push(destination);
    }
  }, [batchJobs, jobId, folderName, currentStep, pendingNavigationUrl, fetchUnfinishedJobs, router]);

  // Feature 4: Confirm Don't Save
  const confirmDontSave = useCallback(async () => {
    setIsSavingLeave(true);
    try {
      const jobsToDiscard = batchJobs.length > 0 ? batchJobs : (jobId ? [{ jobId }] : []);
      for (const j of jobsToDiscard) {
        if (j.jobId) {
          await discardJob(j.jobId);
        }
      }
    } catch (err) {
      console.error("Error during Don't Save discard:", err);
    } finally {
      setIsSavingLeave(false);
      setIsLeaveModalOpen(false);
      const destination = pendingNavigationUrl || "/upload";
      setPendingNavigationUrl(null);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      setFilesState([]);
      setFolderModeState("SAME");
      setFolderNameState("");
      setFolderMapState({});
      setJobId(null);
      setBatchId(null);
      setBatchJobs([]);
      setActiveJobIndex(0);
      setExtractionResult(null);
      setConversionResult(null);
      setJobStatus(null);
      setConvertDecision(null);
      setIsExtracting(false);
      setIsConverting(false);
      setError(null);
      await fetchUnfinishedJobs();
      router.push(destination);
    }
  }, [batchJobs, jobId, pendingNavigationUrl, fetchUnfinishedJobs, router]);

  // Feature 4: Cancel Leave
  const cancelLeave = useCallback(() => {
    setIsLeaveModalOpen(false);
    setPendingNavigationUrl(null);
  }, []);

  // Perform Step 4: Upload & Extraction (Sequential Batch Execution)
  const performExtraction = useCallback(async (): Promise<boolean> => {
    if (files.length === 0 && !jobId) {
      setError("Please select at least one archive file.");
      return false;
    }
    if (folderMode === "SAME" && !folderName.trim()) {
      setError("Please specify a target folder name.");
      return false;
    }

    setIsExtracting(true);
    setError(null);

    try {
      if (files.length > 0) {
        // 1. Stage upload for all archives
        const uploadBatchRes = await uploadBatchArchives(
          files,
          folderMode,
          folderMode === "SAME" ? folderName.trim() : undefined,
          folderMode === "DIFFERENT" ? folderMap : undefined
        );

        setBatchId(uploadBatchRes.batch_id);

        // Initialize batch jobs
        const initialJobs: BatchJobItem[] = uploadBatchRes.jobs.map((info, idx) => ({
          id: info.job_id,
          file: files[idx] || files[0],
          folderName: info.folder_name,
          order: info.order,
          jobId: info.job_id,
          status: "PENDING",
          extractionResult: null,
          conversionResult: null,
        }));

        setBatchJobs(initialJobs);
        setJobId(initialJobs[0]?.jobId || null);

        // 2. Sequential Extraction Loop
        const updatedJobs = [...initialJobs];
        for (let i = 0; i < updatedJobs.length; i++) {
          setActiveJobIndex(i);
          const currentJob = updatedJobs[i];
          currentJob.status = "EXTRACTING";
          setBatchJobs([...updatedJobs]);

          try {
            const extractRes = await extractZip(currentJob.jobId!);
            currentJob.status = "EXTRACTED";
            currentJob.extractionResult = extractRes;
            if (i === 0) {
              setExtractionResult(extractRes);
            }
          } catch (err: any) {
            console.error(`Extraction failed for ${currentJob.file.name}:`, err);
            currentJob.status = "FAILED";
            currentJob.errorMessage = err.message || "Extraction failed.";
          }
          setBatchJobs([...updatedJobs]);
        }
      } else if (jobId) {
        // Resuming an existing staged job
        const extractRes = await extractZip(jobId);
        setExtractionResult(extractRes);
        if (batchJobs.length > 0) {
          const updated = [...batchJobs];
          updated[0].status = "EXTRACTED";
          updated[0].extractionResult = extractRes;
          setBatchJobs(updated);
        }
      }

      setIsExtracting(false);
      return true;
    } catch (err: any) {
      console.error("Batch extraction staging error:", err);
      setError(err.message || "Failed to stage batch archives.");
      setIsExtracting(false);
      return false;
    }
  }, [files, folderMode, folderName, folderMap, jobId, batchJobs]);

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

  // Perform Step 6: Conversion (Sequential Batch Execution)
  const performConversion = useCallback(async (): Promise<boolean> => {
    const jobsToConvert = batchJobs.length > 0 ? [...batchJobs] : (jobId ? [{ jobId, folderName, status: "EXTRACTED" as const, file: new File([], "archive") }] : []);
    if (jobsToConvert.length === 0) {
      setError("No active extraction jobs found to convert.");
      return false;
    }

    setIsConverting(true);
    setError(null);

    try {
      const updatedJobs = [...jobsToConvert] as BatchJobItem[];
      for (let i = 0; i < updatedJobs.length; i++) {
        const currentJob = updatedJobs[i];
        if (!currentJob.jobId) continue;

        setActiveJobIndex(i);
        currentJob.status = "CONVERTING";
        setBatchJobs([...updatedJobs]);
        startStatusPolling(currentJob.jobId);

        try {
          const convertRes = await convertWordDocuments(currentJob.jobId);
          currentJob.status = "COMPLETED";
          currentJob.conversionResult = convertRes;
          if (i === 0) {
            setConversionResult(convertRes);
          }
        } catch (err: any) {
          console.error(`Conversion failed for ${currentJob.file?.name || currentJob.jobId}:`, err);
          currentJob.status = "FAILED";
          currentJob.errorMessage = err.message || "Conversion failed.";
        }
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        setBatchJobs([...updatedJobs]);
      }

      setIsConverting(false);
      return true;
    } catch (err: any) {
      console.error("Batch conversion error:", err);
      setError(err.message || "Failed to convert Word documents to PDF.");
      setIsConverting(false);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      return false;
    }
  }, [batchJobs, jobId, folderName]);

  // Step 5 Decision (Supports single & batch)
  const chooseConversion = useCallback(async (decision: "YES" | "NO") => {
    setConvertDecision(decision);
    if (decision === "YES") {
      router.push("/conversion");
    } else {
      // Mark all jobs as finished without conversion
      for (const job of batchJobs) {
        if (job.jobId && job.status === "EXTRACTED") {
          try {
            await finishWithoutConversion(job.jobId);
            job.status = "FINISHED_NO_CONVERSION";
          } catch (err) {
            console.error("Finish without conversion warning:", err);
          }
        }
      }
      if (jobId && batchJobs.length === 0) {
        try {
          await finishWithoutConversion(jobId);
        } catch (err) {
          console.error("Finish without conversion warning:", err);
        }
      }
      router.push("/summary");
    }
  }, [batchJobs, jobId, router]);

  // Reset all state
  const resetWorkflow = useCallback(() => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    setFilesState([]);
    setFolderModeState("SAME");
    setFolderNameState("");
    setFolderMapState({});
    setJobId(null);
    setBatchId(null);
    setBatchJobs([]);
    setActiveJobIndex(0);
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
        files,
        file,
        folderMode,
        folderName,
        folderMap,
        jobId,
        batchId,
        batchJobs,
        activeJobIndex,
        extractionResult,
        conversionResult,
        jobStatus,
        convertDecision,
        isExtracting,
        isConverting,
        error,
        unfinishedJobs,
        isLoadingUnfinished,
        isLeaveModalOpen,
        isSavingLeave,
        setFiles,
        setFile,
        addFiles,
        removeFile,
        setFolderMode,
        setFolderName,
        setFolderForFile,
        clearError,
        performExtraction,
        chooseConversion,
        performConversion,
        resetWorkflow,
        canAccessStep,
        fetchUnfinishedJobs,
        resumeUnfinishedJob,
        discardUnfinishedJob,
        requestLeaveWorkflow,
        confirmSaveAndExit,
        confirmDontSave,
        cancelLeave,
        hasActiveUnfinishedWorkflow,
      }}
    >
      {children}
      <LeaveWorkflowModal
        isOpen={isLeaveModalOpen}
        onSaveAndExit={confirmSaveAndExit}
        onDontSave={confirmDontSave}
        onCancel={cancelLeave}
        isSaving={isSavingLeave}
      />
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
