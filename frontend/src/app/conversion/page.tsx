"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRightLeft,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileText,
  FileCheck2,
  ArrowRight,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import { useWorkflow } from "@/context/WorkflowContext";

export default function ConversionPage() {
  const router = useRouter();
  const {
    performConversion,
    conversionResult,
    jobStatus,
    isConverting,
    error,
    clearError,
    folderName,
    extractionResult,
  } = useWorkflow();

  const conversionStartedRef = useRef(false);

  useEffect(() => {
    // Automatically start conversion when entering Step 6 if not already done
    if (!conversionResult && !isConverting && !conversionStartedRef.current) {
      conversionStartedRef.current = true;
      performConversion();
    }
  }, [conversionResult, isConverting, performConversion]);

  const totalFiles = jobStatus?.total_to_convert || extractionResult?.word_files || 1;
  const convertedCount = jobStatus?.converted_count || conversionResult?.successfully_converted || 0;
  const failedCount = jobStatus?.failed_count || conversionResult?.failed_files_count || 0;
  const processedCount = convertedCount + failedCount;
  const progressPercent = Math.min(100, Math.round((processedCount / totalFiles) * 100));

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
              ? "Converting Word Documents..."
              : error
              ? "Conversion Failed"
              : "Conversion Complete"}
          </h2>
          <p className="text-[#64748B] text-sm mt-1.5 max-w-md mx-auto">
            {isConverting
              ? "High-fidelity conversion in progress. Generated PDFs are being placed in PDF/."
              : error
              ? "An error occurred during document conversion."
              : `All Word files have been converted and saved to Output/${folderName}/PDF/.`}
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
                  <h4 className="text-sm font-bold text-[#0F172A]">Converting Word to PDF</h4>
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
                  {processedCount} / {totalFiles} Files
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
                <span className="text-[10px] uppercase font-semibold text-[#64748B] block">Total</span>
                <span className="text-lg font-bold text-[#0F172A]">{totalFiles}</span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                <span className="text-[10px] uppercase font-semibold text-emerald-700 block">Converted</span>
                <span className="text-lg font-bold text-emerald-700">{convertedCount}</span>
              </div>
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-center">
                <span className="text-[10px] uppercase font-semibold text-red-700 block">Failed</span>
                <span className="text-lg font-bold text-red-700">{failedCount}</span>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {!isConverting && error && (
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
        {!isConverting && conversionResult && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-center">
                <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block">
                  Word Found
                </span>
                <span className="text-2xl font-black text-[#0F172A] mt-1 block">
                  {conversionResult.word_files_found}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">
                  Converted
                </span>
                <span className="text-2xl font-black text-emerald-700 mt-1 block">
                  {conversionResult.successfully_converted}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-center">
                <span className="text-[11px] font-semibold text-red-700 uppercase tracking-wider block">
                  Failed
                </span>
                <span className="text-2xl font-black text-red-700 mt-1 block">
                  {conversionResult.failed_files_count}
                </span>
              </div>
            </div>

            {/* If there were failures, display file list */}
            {conversionResult.failed_files.length > 0 && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 space-y-2">
                <span className="text-xs font-bold text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> Failed Files:
                </span>
                {conversionResult.failed_files.map((file, idx) => (
                  <div key={idx} className="text-xs text-red-600 font-mono pl-6">
                    • <span className="font-bold">{file.word_filename}</span>: {file.error_message || "Unknown error"}
                  </div>
                ))}
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
