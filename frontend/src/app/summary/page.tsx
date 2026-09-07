"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import {
  CheckCircle2,
  Layers,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import { useWorkflow } from "@/context/WorkflowContext";
import { FileProcessingReport } from "@/components/FileProcessingReport";

export default function SummaryPage() {
  const router = useRouter();
  const {
    extractionResult,
    conversionResult,
    convertDecision,
    folderName,
    resetWorkflow,
  } = useWorkflow();

  const isSkipped = convertDecision === "NO" || !conversionResult;

  useEffect(() => {
    if (!isSkipped && conversionResult && conversionResult.successfully_converted > 0) {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  }, [isSkipped, conversionResult]);

  const targetFolderDisplay = folderName || extractionResult?.folder_name || "job description";

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-8">
      <div className="glass-card rounded-2xl p-8 sm:p-10">
        {/* Step Badge & Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-3">
            Step 7 of 7
          </span>
          <h2 className="text-3xl font-extrabold text-[#0F172A] tracking-tight">
            Processing Complete
          </h2>
          <p className="text-[#64748B] text-sm mt-1.5 max-w-md mx-auto">
            Target folder <span className="font-mono text-[#2563EB] font-semibold">Output/{targetFolderDisplay}</span> has been created and organized.
          </p>
        </div>

        {/* Executive Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {/* Extraction Summary */}
          <div className="p-5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0F172A] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#2563EB]" /> Extraction Summary
              </span>
              <span className="text-[10px] font-mono text-[#64748B] bg-white border border-[#E2E8F0] px-2 py-0.5 rounded">
                Output/{targetFolderDisplay}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono">
              <div className="p-2.5 rounded-xl bg-white border border-[#E2E8F0]">
                <span className="text-[10px] text-blue-700 block font-sans">Word Files</span>
                <span className="text-xl font-black text-[#2563EB]">
                  {extractionResult?.word_files || 0}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-[#E2E8F0]">
                <span className="text-[10px] text-emerald-700 block font-sans">Existing PDFs</span>
                <span className="text-xl font-black text-emerald-600">
                  {extractionResult?.existing_pdf_files || 0}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-[#E2E8F0]">
                <span className="text-[10px] text-amber-700 block font-sans">Unsupported</span>
                <span className="text-xl font-black text-amber-600">
                  {extractionResult?.unsupported_files || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Conversion Summary */}
          <div className="p-5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0F172A] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#2563EB]" /> Conversion Summary
              </span>
              <span className="text-[10px] font-mono text-[#64748B] bg-white border border-[#E2E8F0] px-2 py-0.5 rounded">
                {isSkipped ? "Conversion Skipped" : "Word to PDF"}
              </span>
            </div>

            {isSkipped ? (
              <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] flex items-center justify-center text-center text-xs text-[#64748B]">
                Word files were extracted and preserved without conversion.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono">
                <div className="p-2.5 rounded-xl bg-white border border-[#E2E8F0]">
                  <span className="text-[10px] text-[#64748B] block font-sans">Word Selected</span>
                  <span className="text-xl font-black text-[#0F172A]">
                    {conversionResult?.word_files_found || 0}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="text-[10px] text-emerald-700 block font-sans">Converted</span>
                  <span className="text-xl font-black text-emerald-600">
                    {conversionResult?.successfully_converted || 0}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-red-50 border border-red-200">
                  <span className="text-[10px] text-red-700 block font-sans">Failed</span>
                  <span className="text-xl font-black text-red-600">
                    {conversionResult?.failed_files_count || 0}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* File Processing Report Component */}
        <div className="mb-8 p-6 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
          <FileProcessingReport
            extractionSummary={extractionResult}
            conversionSummary={conversionResult}
            noConversion={isSkipped}
          />
        </div>

        {/* Workflow Actions */}
        <div className="flex items-center justify-end pt-4 border-t border-[#E2E8F0]">
          <button
            type="button"
            onClick={resetWorkflow}
            className="w-full sm:w-auto px-7 py-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-sm shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 hover:scale-[1.02]"
          >
            <RotateCcw className="w-4 h-4" /> Process Another Archive
          </button>
        </div>
      </div>
    </div>
  );
}
