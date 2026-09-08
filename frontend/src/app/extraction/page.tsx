"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  RefreshCw,
  CheckCircle2,
  FileText,
  FileCheck2,
  Folder,
  ArrowRight,
  AlertCircle,
  RotateCcw,
  XCircle,
  FileArchive,
} from "lucide-react";
import { useWorkflow } from "@/context/WorkflowContext";

export default function ExtractionPage() {
  const router = useRouter();
  const {
    performExtraction,
    files,
    batchJobs,
    activeJobIndex,
    extractionResult,
    isExtracting,
    error,
    clearError,
    folderName,
    folderMode,
  } = useWorkflow();

  const extractionStartedRef = useRef(false);

  useEffect(() => {
    // Automatically start extraction when entering Step 4 if not already done
    const hasResults = batchJobs.some((j) => j.extractionResult) || extractionResult;
    if (!hasResults && !isExtracting && !extractionStartedRef.current && files.length > 0) {
      extractionStartedRef.current = true;
      performExtraction();
    }
  }, [batchJobs, extractionResult, isExtracting, files, performExtraction]);

  const handleRetry = () => {
    clearError();
    performExtraction();
  };

  const handleContinue = () => {
    router.push("/decision");
  };

  // Calculate totals across all batch jobs
  const totalDiscovered = batchJobs.length > 0
    ? batchJobs.reduce((sum, j) => sum + (j.extractionResult?.total_files || (j.extractionResult ? j.extractionResult.word_files + j.extractionResult.existing_pdf_files + (j.extractionResult.other_files || 0) : 0)), 0)
    : (extractionResult?.total_files || 0);

  const totalWord = batchJobs.length > 0
    ? batchJobs.reduce((sum, j) => sum + (j.extractionResult?.word_files || 0), 0)
    : (extractionResult?.word_files || 0);

  const totalPdf = batchJobs.length > 0
    ? batchJobs.reduce((sum, j) => sum + (j.extractionResult?.existing_pdf_files || 0), 0)
    : (extractionResult?.existing_pdf_files || 0);

  const totalOther = batchJobs.length > 0
    ? batchJobs.reduce((sum, j) => sum + (j.extractionResult?.other_files || 0), 0)
    : (extractionResult?.other_files || 0);

  const successfulJobsCount = batchJobs.filter((j) => j.status === "EXTRACTED").length;
  const failedJobsCount = batchJobs.filter((j) => j.status === "FAILED").length;

  const currentActiveJob = batchJobs[activeJobIndex] || (files[activeJobIndex] ? { file: files[activeJobIndex], folderName } : { file: files[0], folderName });

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
              ? `Extracting Archive ${activeJobIndex + 1} of ${files.length}...`
              : error && successfulJobsCount === 0
              ? "Extraction Encountered Errors"
              : "Extraction Complete"}
          </h2>
          <p className="text-[#64748B] text-sm mt-1.5 max-w-md mx-auto">
            {isExtracting
              ? `Unpacking '${currentActiveJob?.file?.name || "archive"}' into Output/${currentActiveJob?.folderName || folderName}...`
              : `${files.length} archive${files.length === 1 ? "" : "s"} processed in sequential queue.`}
          </p>
        </div>

        {/* Loading Spinner State */}
        {isExtracting && (
          <div className="py-10 flex flex-col items-center justify-center text-center space-y-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-3xl bg-[#EFF6FF] border border-blue-200 flex items-center justify-center text-[#2563EB] shadow-lg shadow-blue-500/10">
                <RefreshCw className="w-10 h-10 animate-spin" />
              </div>
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0F172A]">
                Processing: <span className="font-mono text-[#2563EB]">{currentActiveJob?.file?.name}</span>
              </h3>
              <p className="text-xs text-[#64748B] mt-1 font-mono">
                Target: Output/{currentActiveJob?.folderName || folderName}
              </p>
            </div>
            {/* Sequential Progress Indicators */}
            <div className="flex items-center gap-2 pt-2">
              {files.map((_, i) => (
                <div
                  key={i}
                  className={`h-2 rounded-full transition-all ${
                    i < activeJobIndex
                      ? "w-6 bg-emerald-500"
                      : i === activeJobIndex
                      ? "w-8 bg-[#2563EB] animate-pulse"
                      : "w-4 bg-slate-200"
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Global Fatal Error */}
        {!isExtracting && error && batchJobs.length === 0 && (
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
                Change Archives
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

        {/* Extraction Success Summary */}
        {!isExtracting && (batchJobs.length > 0 || extractionResult) && (
          <div className="space-y-6">
            {/* Aggregated Stats Breakdown Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-center">
                <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block">
                  Total Discovered
                </span>
                <span className="text-2xl sm:text-3xl font-black text-[#0F172A] mt-1 block">
                  {totalDiscovered}
                </span>
                <span className="text-[10px] text-[#64748B]">Across All Archives</span>
              </div>

              <div className="p-4 rounded-xl bg-[#EFF6FF] border border-blue-200 text-center">
                <span className="text-[11px] font-semibold text-[#2563EB] uppercase tracking-wider block">
                  Word Files
                </span>
                <span className="text-2xl sm:text-3xl font-black text-[#2563EB] mt-1 block">
                  {totalWord}
                </span>
                <span className="text-[10px] text-[#64748B]">.doc / .docx</span>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">
                  Existing PDFs
                </span>
                <span className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1 block">
                  {totalPdf}
                </span>
                <span className="text-[10px] text-[#64748B]">Preserved in PDF/</span>
              </div>

              <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-center">
                <span className="text-[11px] font-semibold text-purple-700 uppercase tracking-wider block">
                  Other Files
                </span>
                <span className="text-2xl sm:text-3xl font-black text-purple-700 mt-1 block">
                  {totalOther}
                </span>
                <span className="text-[10px] text-[#64748B]">Retained in Other/</span>
              </div>
            </div>

            {/* Batch Jobs Breakdown Table */}
            {batchJobs.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#0F172A] block">
                  Archive Job Results ({successfulJobsCount} Succeeded, {failedJobsCount} Failed):
                </span>
                <div className="rounded-xl border border-[#E2E8F0] bg-white overflow-hidden shadow-2xs max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-semibold uppercase tracking-wider text-[10px] z-10">
                      <tr>
                        <th className="py-2.5 px-3">Archive</th>
                        <th className="py-2.5 px-3">Target Folder</th>
                        <th className="py-2.5 px-3 text-center">Word</th>
                        <th className="py-2.5 px-3 text-center">PDF</th>
                        <th className="py-2.5 px-3 text-center">Other</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0] font-mono">
                      {batchJobs.map((job, idx) => (
                        <tr key={idx} className="hover:bg-[#F8FAFC] transition-colors">
                          <td className="py-2.5 px-3 text-[#0F172A] font-medium">
                            <span className="truncate max-w-[130px] block" title={job.file.name}>
                              {job.file.name}
                            </span>
                            {job.errorMessage && (
                              <span className="text-[10px] text-red-600 block font-sans mt-0.5">
                                {job.errorMessage}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-[#2563EB] font-sans font-medium text-[11px]">
                            Output/{job.folderName}
                          </td>
                          <td className="py-2.5 px-3 text-center text-blue-700 font-bold">
                            {job.extractionResult?.word_files ?? 0}
                          </td>
                          <td className="py-2.5 px-3 text-center text-emerald-700 font-bold">
                            {job.extractionResult?.existing_pdf_files ?? 0}
                          </td>
                          <td className="py-2.5 px-3 text-center text-purple-700 font-bold">
                            {job.extractionResult?.other_files ?? 0}
                          </td>
                          <td className="py-2.5 px-3 font-sans">
                            {job.status === "EXTRACTED" ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Extracted
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                                <XCircle className="w-3 h-3 text-red-600" /> Failed
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Continue Button */}
            <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-between">
              <span className="text-xs text-emerald-700 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Extraction complete for all queue items
              </span>

              <button
                type="button"
                onClick={handleContinue}
                disabled={successfulJobsCount === 0 && !extractionResult}
                className="px-7 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-sm shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
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
