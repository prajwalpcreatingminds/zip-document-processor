"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { useWorkflow } from "@/context/WorkflowContext";

export default function ConversionPage() {
  const router = useRouter();
  const {
    performConversion,
    batchJobs,
    activeJobIndex,
    conversionResult,
    jobStatus,
    isConverting,
    error,
    clearError,
    folderName,
    extractionResult,
    files,
  } = useWorkflow();

  const conversionStartedRef = useRef(false);

  useEffect(() => {
    // Automatically start conversion when entering Step 6 if not already done
    const hasConverted = batchJobs.some((j) => j.conversionResult) || conversionResult;
    if (!hasConverted && !isConverting && !conversionStartedRef.current) {
      conversionStartedRef.current = true;
      performConversion();
    }
  }, [batchJobs, conversionResult, isConverting, performConversion]);

  // Aggregate stats across batch jobs
  const totalWordFound = batchJobs.length > 0
    ? batchJobs.reduce((sum, j) => sum + (j.conversionResult?.word_files_found || j.extractionResult?.word_files || 0), 0)
    : (conversionResult?.word_files_found || extractionResult?.word_files || 1);

  const totalConverted = batchJobs.length > 0
    ? batchJobs.reduce((sum, j) => sum + (j.conversionResult?.successfully_converted || 0), 0)
    : (conversionResult?.successfully_converted || 0);

  const totalFailed = batchJobs.length > 0
    ? batchJobs.reduce((sum, j) => sum + (j.conversionResult?.failed_files_count || (j.status === "FAILED" ? 1 : 0)), 0)
    : (conversionResult?.failed_files_count || 0);

  const processedCount = totalConverted + totalFailed;
  const progressPercent = Math.min(100, Math.round((processedCount / (totalWordFound || 1)) * 100));

  const currentActiveJob = batchJobs[activeJobIndex] || (files[activeJobIndex] ? { file: files[activeJobIndex], folderName } : { file: files[0], folderName });
  const currentFile = jobStatus?.current_file;

  const handleContinue = () => {
    router.push("/summary");
  };

  const handleRetry = () => {
    clearError();
    performConversion();
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <div className="glass-card rounded-2xl p-8 sm:p-10">
        {/* Step Badge & Header */}
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EFF6FF] text-[#2563EB] border border-blue-200 mb-3">
            Step 6 of 7
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#0F172A] tracking-tight">
            {isConverting
              ? `Converting Archive ${activeJobIndex + 1} of ${files.length}...`
              : error && totalConverted === 0
              ? "Conversion Failed"
              : "Conversion Complete"}
          </h2>
          <p className="text-[#64748B] text-sm mt-1.5 max-w-md mx-auto">
            {isConverting
              ? `Processing '${currentActiveJob?.file?.name || "documents"}'. Generated PDFs placed in Output/${currentActiveJob?.folderName || folderName}/PDF/.`
              : error && totalConverted === 0
              ? "An error occurred during document conversion."
              : `All Word files converted across ${files.length} archive batch.`}
          </p>
        </div>

        {/* Live Conversion Progress Box */}
        {isConverting && (
          <div className="space-y-6">
            {/* Animated Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] border border-blue-200 flex items-center justify-center text-[#2563EB]">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#0F172A]">
                    {currentActiveJob?.file?.name || "Converting Word Documents"}
                  </h4>
                  <p className="text-xs text-[#64748B] font-mono">
                    {currentFile ? (
                      <span className="text-[#2563EB] font-semibold">
                        {currentFile} &rarr; {currentFile.replace(/\.[^/.]+$/, ".pdf")}
                      </span>
                    ) : (
                      "Initializing document converter..."
                    )}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-2xl font-black text-[#0F172A]">{progressPercent}%</span>
                <span className="text-[11px] text-[#64748B] block font-mono">
                  {processedCount} / {totalWordFound} Files
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="w-full h-3 rounded-full bg-slate-100 border border-[#E2E8F0] overflow-hidden p-0.5">
                <div
                  className="h-full rounded-full bg-[#2563EB] transition-all duration-300 shadow-[0_0_8px_rgba(37,99,235,0.3)]"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Live Counter Badges */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-center">
                <span className="text-[10px] uppercase font-semibold text-[#64748B] block">Total Word</span>
                <span className="text-lg font-bold text-[#0F172A]">{totalWordFound}</span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                <span className="text-[10px] uppercase font-semibold text-emerald-700 block">Converted</span>
                <span className="text-lg font-bold text-emerald-700">{totalConverted}</span>
              </div>
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-center">
                <span className="text-[10px] uppercase font-semibold text-red-700 block">Failed</span>
                <span className="text-lg font-bold text-red-700">{totalFailed}</span>
              </div>
            </div>
          </div>
        )}

        {/* Fatal Error State */}
        {!isConverting && error && totalConverted === 0 && (
          <div className="p-6 rounded-2xl bg-red-50 border border-red-200 space-y-4 mb-6">
            <div className="flex items-center gap-3 text-red-700 font-bold text-base">
              <AlertCircle className="w-6 h-6 flex-shrink-0 text-red-600" />
              <span>Conversion error</span>
            </div>
            <p className="text-xs text-red-600 font-mono pl-9">{error}</p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleRetry}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-2 shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Retry Conversion
              </button>
            </div>
          </div>
        )}

        {/* Conversion Complete State */}
        {!isConverting && (batchJobs.some((j) => j.conversionResult) || conversionResult) && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-center">
                <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block">
                  Word Discovered
                </span>
                <span className="text-2xl font-black text-[#0F172A] mt-1 block">
                  {totalWordFound}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">
                  Successfully Converted
                </span>
                <span className="text-2xl font-black text-emerald-700 mt-1 block">
                  {totalConverted}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-center">
                <span className="text-[11px] font-semibold text-red-700 uppercase tracking-wider block">
                  Failed Files
                </span>
                <span className="text-2xl font-black text-red-700 mt-1 block">
                  {totalFailed}
                </span>
              </div>
            </div>

            {/* Batch Job Conversion Table */}
            {batchJobs.length > 0 && (
              <div className="rounded-xl border border-[#E2E8F0] bg-white overflow-hidden shadow-2xs max-h-52 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-semibold uppercase tracking-wider text-[10px] z-10">
                    <tr>
                      <th className="py-2.5 px-3">Archive</th>
                      <th className="py-2.5 px-3">Target Folder</th>
                      <th className="py-2.5 px-3 text-center">Converted</th>
                      <th className="py-2.5 px-3 text-center">Failed</th>
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
                        </td>
                        <td className="py-2.5 px-3 text-[#2563EB] font-sans font-medium text-[11px]">
                          Output/{job.folderName}
                        </td>
                        <td className="py-2.5 px-3 text-center text-emerald-700 font-bold">
                          {job.conversionResult?.successfully_converted ?? 0}
                        </td>
                        <td className="py-2.5 px-3 text-center text-red-700 font-bold">
                          {job.conversionResult?.failed_files_count ?? (job.status === "FAILED" ? 1 : 0)}
                        </td>
                        <td className="py-2.5 px-3 font-sans">
                          {job.status === "COMPLETED" ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Completed
                            </span>
                          ) : job.status === "FAILED" ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                              <XCircle className="w-3 h-3 text-red-600" /> Failed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                              {job.status}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* View Summary Action Button */}
            <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-between">
              <span className="text-xs text-emerald-700 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Conversion complete
              </span>

              <button
                type="button"
                onClick={handleContinue}
                className="px-7 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-sm shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 hover:scale-[1.02]"
              >
                View Summary &amp; Report <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
