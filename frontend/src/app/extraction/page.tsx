"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  RefreshCw,
  CheckCircle2,
  FileText,
  FileCheck2,
  AlertTriangle,
  Folder,
  ArrowRight,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { useWorkflow } from "@/context/WorkflowContext";

export default function ExtractionPage() {
  const router = useRouter();
  const {
    performExtraction,
    extractionResult,
    isExtracting,
    error,
    clearError,
    folderName,
    file,
  } = useWorkflow();

  const [hasTriggered, setHasTriggered] = useState(false);
  const extractionStartedRef = useRef(false);

  useEffect(() => {
    // Automatically start extraction when entering Step 4 if not already done
    if (!extractionResult && !isExtracting && !extractionStartedRef.current) {
      extractionStartedRef.current = true;
      setHasTriggered(true);
      performExtraction();
    }
  }, [extractionResult, isExtracting, performExtraction]);

  const handleRetry = () => {
    clearError();
    performExtraction();
  };

  const handleContinue = () => {
    if (extractionResult) {
      router.push("/decision");
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      <div className="glass-card rounded-2xl p-8 sm:p-10">
        {/* Step Badge & Header */}
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EFF6FF] text-[#2563EB] border border-blue-200 mb-3">
            Step 4 of 7
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#0F172A] tracking-tight">
            {isExtracting
              ? "Extracting & Organizing Documents..."
              : error
              ? "Extraction Failed"
              : "Extraction Complete"}
          </h2>
          <p className="text-[#64748B] text-sm mt-1.5 max-w-md mx-auto">
            {isExtracting
              ? `Unpacking ${file?.name || "ZIP archive"} into Output/${folderName}...`
              : error
              ? "An issue occurred while unpacking the archive."
              : `All files have been successfully categorized in Output/${folderName}.`}
          </p>
        </div>

        {/* Loading Spinner State */}
        {isExtracting && (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <div className="relative mb-6">
              <div className="w-20 h-20 rounded-3xl bg-[#EFF6FF] border border-blue-200 flex items-center justify-center text-[#2563EB] shadow-lg shadow-blue-500/10">
                <RefreshCw className="w-10 h-10 animate-spin" />
              </div>
            </div>
            <h3 className="text-lg font-bold text-[#0F172A] mb-2">Extracting archive...</h3>
            <p className="text-xs text-[#64748B] max-w-sm">
              Separating Word documents (.doc, .docx) into <span className="text-[#2563EB] font-mono font-semibold">Word/</span> and PDFs into <span className="text-emerald-600 font-mono font-semibold">PDF/</span> while preserving the original ZIP archive.
            </p>
          </div>
        )}

        {/* Error State */}
        {!isExtracting && error && (
          <div className="p-6 rounded-2xl bg-red-50 border border-red-200 space-y-4 mb-6">
            <div className="flex items-center gap-3 text-red-700 font-bold text-base">
              <AlertCircle className="w-6 h-6 flex-shrink-0 text-red-600" />
              <span>Extraction encountered an error</span>
            </div>
            <p className="text-xs text-red-600 font-mono pl-9">{error}</p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => router.push("/upload")}
                className="px-4 py-2 rounded-xl border border-[#E2E8F0] hover:bg-white text-[#64748B] text-xs font-semibold"
              >
                Change Archive
              </button>
              <button
                type="button"
                onClick={handleRetry}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-2 shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Retry Extraction
              </button>
            </div>
          </div>
        )}

        {/* Extraction Success Summary Card */}
        {!isExtracting && extractionResult && (
          <div className="space-y-6">
            {/* Stats Breakdown Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-center">
                <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block">
                  Files Discovered
                </span>
                <span className="text-2xl sm:text-3xl font-black text-[#0F172A] mt-1 block">
                  {extractionResult.total_supported_files + extractionResult.unsupported_files}
                </span>
                <span className="text-[10px] text-[#64748B]">In Archive</span>
              </div>

              <div className="p-4 rounded-xl bg-[#EFF6FF] border border-blue-200 text-center">
                <span className="text-[11px] font-semibold text-[#2563EB] uppercase tracking-wider block">
                  Word Files
                </span>
                <span className="text-2xl sm:text-3xl font-black text-[#2563EB] mt-1 block">
                  {extractionResult.word_files}
                </span>
                <span className="text-[10px] text-[#64748B]">.doc / .docx</span>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">
                  Existing PDFs
                </span>
                <span className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1 block">
                  {extractionResult.existing_pdf_files}
                </span>
                <span className="text-[10px] text-[#64748B]">Already in ZIP</span>
              </div>

              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-center">
                <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider block">
                  Unsupported
                </span>
                <span className="text-2xl sm:text-3xl font-black text-amber-700 mt-1 block">
                  {extractionResult.unsupported_files}
                </span>
                <span className="text-[10px] text-[#64748B]">Skipped non-doc</span>
              </div>
            </div>

            {/* Folder Structure Path Badges */}
            <div className="space-y-2 text-xs font-mono">
              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between">
                <span className="text-[#64748B] flex items-center gap-2">
                  <Folder className="w-4 h-4 text-[#2563EB]" /> Word Directory:
                </span>
                <span className="text-[#2563EB] font-semibold">{extractionResult.word_folder}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between">
                <span className="text-[#64748B] flex items-center gap-2">
                  <Folder className="w-4 h-4 text-emerald-600" /> PDF Directory:
                </span>
                <span className="text-emerald-700 font-semibold">{extractionResult.pdf_folder}</span>
              </div>
            </div>

            {/* Continue Button */}
            <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-between">
              <span className="text-xs text-emerald-700 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Extraction complete
              </span>

              <button
                type="button"
                onClick={handleContinue}
                className="px-7 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-sm shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 hover:scale-[1.02]"
              >
                Continue to Convert Decision <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
