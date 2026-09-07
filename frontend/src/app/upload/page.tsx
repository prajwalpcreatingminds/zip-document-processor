"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, FileArchive, CheckCircle2, AlertCircle, X, ArrowRight } from "lucide-react";
import { useWorkflow } from "@/context/WorkflowContext";

export default function UploadPage() {
  const router = useRouter();
  const { file, setFile } = useWorkflow();

  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndSetFile = (selectedFile: File) => {
    setErrorMessage(null);
    if (!selectedFile.name.toLowerCase().endsWith(".zip")) {
      setErrorMessage("Invalid file format. Only ZIP (.zip) archives are accepted.");
      return;
    }
    if (selectedFile.size === 0) {
      setErrorMessage("The selected ZIP file is empty (0 bytes).");
      return;
    }
    if (selectedFile.size > 200 * 1024 * 1024) {
      setErrorMessage("File exceeds the maximum 200MB size limit.");
      return;
    }
    setFile(selectedFile);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleContinue = () => {
    if (file) {
      router.push("/folder");
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="glass-card rounded-2xl p-8 sm:p-10 transition-all">
        {/* Step Badge & Header */}
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EFF6FF] text-[#2563EB] border border-blue-200 mb-3">
            Step 1 of 7
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#0F172A] tracking-tight">
            Upload ZIP File
          </h2>
          <p className="text-[#64748B] text-sm mt-1.5 max-w-md mx-auto">
            Select a ZIP archive containing Word and PDF documents to begin processing.
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
        {!file ? (
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
              accept=".zip,application/zip,application/x-zip-compressed"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-16 h-16 rounded-2xl bg-[#EFF6FF] border border-blue-200 flex items-center justify-center text-[#2563EB] group-hover:scale-110 group-hover:bg-blue-100 transition-all mb-4 shadow-sm">
              <UploadCloud className="w-8 h-8" />
            </div>
            <p className="text-base font-semibold text-[#0F172A] group-hover:text-[#2563EB] transition-colors">
              Drag &amp; Drop ZIP Here
            </p>
            <p className="text-xs text-[#64748B] mt-1">
              or <span className="text-[#2563EB] font-medium underline underline-offset-4">browse from your computer</span>
            </p>
            <div className="mt-5 flex items-center gap-2 text-xs text-[#64748B] bg-white px-3 py-1.5 rounded-lg border border-[#E2E8F0] shadow-2xs">
              <FileArchive className="w-4 h-4 text-[#2563EB]" />
              <span>Supported format: .zip archives up to 200MB</span>
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-[#EFF6FF] border border-blue-200 flex items-center justify-center text-[#2563EB] flex-shrink-0">
                  <FileArchive className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                      Selected File:
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" /> Ready
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-[#0F172A] mt-0.5 truncate font-mono">
                    {file.name}
                  </h3>
                  <p className="text-xs text-[#64748B]">{formatFileSize(file.size)}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setFile(null)}
                className="p-2.5 rounded-xl text-[#64748B] hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0"
                title="Change or remove file"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                  fileInputRef.current?.click();
                }}
                className="text-xs font-semibold text-[#64748B] hover:text-[#0F172A] transition-colors"
              >
                Choose a different file
              </button>

              <button
                type="button"
                onClick={handleContinue}
                className="px-6 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-sm shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 hover:scale-[1.02]"
              >
                Continue to Target Folder <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
