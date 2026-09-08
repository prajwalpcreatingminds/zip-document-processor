"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, FileArchive, CheckCircle2, AlertCircle, X, ArrowRight, Plus } from "lucide-react";
import { useWorkflow } from "@/context/WorkflowContext";
import { UnfinishedJobsBanner } from "@/components/UnfinishedJobsBanner";

export default function UploadPage() {
  const router = useRouter();
  const {
    files,
    setFiles,
    addFiles,
    removeFile,
    unfinishedJobs,
    resumeUnfinishedJob,
    discardUnfinishedJob,
    isLoadingUnfinished,
    fetchUnfinishedJobs,
  } = useWorkflow();

  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSupportedArchive = (filename: string): boolean => {
    const lower = filename.toLowerCase();
    return (
      lower.endsWith(".zip") ||
      lower.endsWith(".rar") ||
      lower.endsWith(".7z") ||
      lower.endsWith(".tar") ||
      lower.endsWith(".tgz") ||
      lower.endsWith(".tar.gz") ||
      lower.endsWith(".tar.xz")
    );
  };

  const getArchiveBadgeColor = (filename: string) => {
    const lower = filename.toLowerCase();
    if (lower.endsWith(".zip")) return "bg-blue-50 text-blue-700 border-blue-200";
    if (lower.endsWith(".rar")) return "bg-purple-50 text-purple-700 border-purple-200";
    if (lower.endsWith(".7z")) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (lower.endsWith(".tar") || lower.endsWith(".tgz") || lower.endsWith(".tar.gz") || lower.endsWith(".tar.xz")) {
      return "bg-amber-50 text-amber-700 border-amber-200";
    }
    return "bg-slate-50 text-slate-700 border-slate-200";
  };

  const validateAndProcessFiles = (selectedFiles: FileList | File[]) => {
    setErrorMessage(null);
    const validFiles: File[] = [];
    const invalidNames: string[] = [];

    Array.from(selectedFiles).forEach((f) => {
      if (!isSupportedArchive(f.name)) {
        invalidNames.push(f.name);
      } else if (f.size === 0) {
        setErrorMessage(`'${f.name}' is empty (0 bytes).`);
      } else if (f.size > 200 * 1024 * 1024) {
        setErrorMessage(`'${f.name}' exceeds the maximum 200MB size limit.`);
      } else {
        validFiles.push(f);
      }
    });

    if (invalidNames.length > 0) {
      setErrorMessage(
        `Unsupported archive format: ${invalidNames.join(", ")}. Supported formats: .zip, .rar, .7z, .tar, .tgz, .tar.xz`
      );
    }

    if (validFiles.length > 0) {
      if (files.length === 0) {
        setFiles(validFiles);
      } else {
        addFiles(validFiles);
      }
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndProcessFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndProcessFiles(e.target.files);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleContinue = () => {
    if (files.length > 0) {
      router.push("/folder");
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Feature 4: Unfinished Jobs Banner */}
      <UnfinishedJobsBanner
        jobs={unfinishedJobs}
        onResume={resumeUnfinishedJob}
        onDiscard={discardUnfinishedJob}
        isLoading={isLoadingUnfinished}
        onRefresh={fetchUnfinishedJobs}
      />

      <div className="glass-card rounded-2xl p-8 sm:p-10 transition-all">
        {/* Step Badge & Header */}
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EFF6FF] text-[#2563EB] border border-blue-200 mb-3">
            Step 1 of 7
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#0F172A] tracking-tight">
            Upload Archive Files
          </h2>
          <p className="text-[#64748B] text-sm mt-1.5 max-w-md mx-auto">
            Select one or multiple archives containing Word and PDF documents to begin processing.
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Upload Box */}
        {files.length === 0 ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-10 sm:p-12 text-center cursor-pointer transition-all flex flex-col items-center justify-center group ${
              isDragging
                ? "border-[#2563EB] bg-[#EFF6FF] scale-[1.01]"
                : "border-[#E2E8F0] hover:border-[#2563EB] bg-[#F8FAFC] hover:bg-[#EFF6FF]/50"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".zip,.rar,.7z,.tar,.tgz,.tar.gz,.tar.xz,application/zip,application/x-zip-compressed,application/x-rar-compressed,application/x-7z-compressed,application/x-tar,application/gzip,application/x-xz"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-16 h-16 rounded-2xl bg-[#EFF6FF] border border-blue-200 flex items-center justify-center text-[#2563EB] group-hover:scale-110 group-hover:bg-blue-100 transition-all mb-4 shadow-sm">
              <UploadCloud className="w-8 h-8" />
            </div>
            <p className="text-base font-semibold text-[#0F172A] group-hover:text-[#2563EB] transition-colors">
              Drag &amp; Drop Archives Here
            </p>
            <p className="text-xs text-[#64748B] mt-1">
              or <span className="text-[#2563EB] font-medium underline underline-offset-4">browse single or multiple files</span>
            </p>
            <div className="mt-5 flex items-center gap-2 text-xs text-[#64748B] bg-white px-3 py-1.5 rounded-lg border border-[#E2E8F0] shadow-2xs">
              <FileArchive className="w-4 h-4 text-[#2563EB]" />
              <span>Supported: .zip, .rar, .7z, .tar, .tgz, .tar.xz up to 200MB</span>
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
                  Selected Archives ({files.length}):
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3" /> {files.length} Ready
                </span>
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-lg bg-white border border-[#E2E8F0] hover:border-blue-300 text-xs font-semibold text-[#2563EB] hover:bg-[#EFF6FF] transition-all flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Add More
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".zip,.rar,.7z,.tar,.tgz,.tar.gz,.tar.xz,application/zip,application/x-zip-compressed,application/x-rar-compressed,application/x-7z-compressed,application/x-tar,application/gzip,application/x-xz"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Selected File List */}
            <div className="max-h-60 overflow-y-auto space-y-2.5 pr-1">
              {files.map((f, idx) => (
                <div
                  key={`${f.name}-${idx}`}
                  className="p-3.5 rounded-xl bg-white border border-[#E2E8F0] flex items-center justify-between gap-3 shadow-2xs hover:border-blue-200 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-[#EFF6FF] border border-blue-200 flex items-center justify-center text-[#2563EB] flex-shrink-0">
                      <FileArchive className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#0F172A] font-mono truncate block" title={f.name}>
                          {idx + 1}. {f.name}
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border uppercase ${getArchiveBadgeColor(f.name)}`}>
                          {f.name.split('.').pop()?.toUpperCase()}
                        </span>
                      </div>
                      <span className="text-[11px] text-[#64748B] block mt-0.5">{formatFileSize(f.size)}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    className="p-1.5 rounded-lg text-[#64748B] hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0"
                    title="Remove archive"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setFiles([])}
                className="text-xs font-semibold text-[#64748B] hover:text-red-600 transition-colors"
              >
                Clear all archives
              </button>

              <button
                type="button"
                onClick={handleContinue}
                className="px-6 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-sm shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 hover:scale-[1.02]"
              >
                Continue to Folder Assignment ({files.length}) <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
