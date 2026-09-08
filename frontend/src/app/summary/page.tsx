"use client";

import React, { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import {
  CheckCircle2,
  Layers,
  Sparkles,
  RotateCcw,
  AlertTriangle,
  Folder,
  FileArchive,
  XCircle,
  FileCheck2,
} from "lucide-react";
import { useWorkflow } from "@/context/WorkflowContext";
import { FileProcessingReport } from "@/components/FileProcessingReport";

export default function SummaryPage() {
  const router = useRouter();
  const {
    files,
    folderMode,
    folderName,
    batchJobs,
    extractionResult,
    conversionResult,
    convertDecision,
    resetWorkflow,
  } = useWorkflow();

  const isSkipped = convertDecision === "NO";
  const isBatch = batchJobs.length > 1;

  // Batch Aggregations
  const batchStats = useMemo(() => {
    if (!isBatch) {
      return null;
    }

    const totalArchives = batchJobs.length;
    const completedArchives = batchJobs.filter(
      (j) =>
        j.status === "COMPLETED" ||
        j.status === "FINISHED_NO_CONVERSION" ||
        (j.status === "EXTRACTED" && isSkipped)
    ).length;
    const failedArchives = batchJobs.filter((j) => j.status === "FAILED").length;

    let totalWord = 0;
    let totalExistingPdf = 0;
    let totalOther = 0;
    let totalConverted = 0;
    let totalFailedConversion = 0;

    batchJobs.forEach((j) => {
      if (j.extractionResult) {
        totalWord += j.extractionResult.word_files || 0;
        totalExistingPdf += j.extractionResult.existing_pdf_files || 0;
        totalOther += j.extractionResult.other_files || 0;
      }
      if (j.conversionResult) {
        totalConverted += j.conversionResult.successfully_converted || 0;
        totalFailedConversion += j.conversionResult.failed_files_count || 0;
      }
    });

    return {
      totalArchives,
      completedArchives,
      failedArchives,
      totalWord,
      totalExistingPdf,
      totalOther,
      totalConverted,
      totalFailedConversion,
    };
  }, [batchJobs, isBatch, isSkipped]);

  useEffect(() => {
    const hasSuccessfulConversion =
      (!isSkipped && conversionResult && conversionResult.successfully_converted > 0) ||
      (batchStats && batchStats.totalConverted > 0);

    if (hasSuccessfulConversion) {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  }, [isSkipped, conversionResult, batchStats]);

  const targetFolderDisplay = folderName || extractionResult?.folder_name || "job description";

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-8">
      <div className="glass-card rounded-2xl p-8 sm:p-10">
        {/* Step Badge & Header */}
        <div className="text-center mb-8">
          <div
            className={`w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-sm ${
              batchStats && batchStats.failedArchives > 0
                ? "bg-amber-50 border border-amber-200 text-amber-600"
                : "bg-emerald-50 border border-emerald-200 text-emerald-600"
            }`}
          >
            {batchStats && batchStats.failedArchives > 0 ? (
              <AlertTriangle className="w-8 h-8" />
            ) : (
              <CheckCircle2 className="w-8 h-8" />
            )}
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-3">
            Step 7 of 7 {isBatch ? "— Batch Summary" : ""}
          </span>
          <h2 className="text-3xl font-extrabold text-[#0F172A] tracking-tight">
            {isBatch
              ? batchStats && batchStats.failedArchives > 0
                ? "Batch Completed with Issues"
                : "Batch Processing Complete"
              : "Processing Complete"}
          </h2>
          <p className="text-[#64748B] text-sm mt-1.5 max-w-xl mx-auto">
            {isBatch
              ? `Processed ${batchJobs.length} archives sequentially (${batchStats?.completedArchives || 0} succeeded, ${batchStats?.failedArchives || 0} failed).`
              : `Target folder Output/${targetFolderDisplay} has been created and organized.`}
          </p>
        </div>

        {/* Batch Overview Cards (If Batch) */}
        {isBatch && batchStats ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] text-center">
              <span className="text-xs font-semibold text-[#64748B] block">Total Archives</span>
              <span className="text-2xl font-black text-[#0F172A] font-mono mt-1 block">
                {batchStats.totalArchives}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-center">
              <span className="text-xs font-semibold text-emerald-700 block">Succeeded</span>
              <span className="text-2xl font-black text-emerald-600 font-mono mt-1 block">
                {batchStats.completedArchives}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-red-50/70 border border-red-200 text-center">
              <span className="text-xs font-semibold text-red-700 block">Failed</span>
              <span className="text-2xl font-black text-red-600 font-mono mt-1 block">
                {batchStats.failedArchives}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 text-center">
              <span className="text-xs font-semibold text-blue-700 block">
                {isSkipped ? "Word Extracted" : "PDFs Created"}
              </span>
              <span className="text-2xl font-black text-[#2563EB] font-mono mt-1 block">
                {isSkipped ? batchStats.totalWord : batchStats.totalConverted}
              </span>
            </div>
          </div>
        ) : (
          /* Single Archive Summary Cards */
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
                <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200">
                  <span className="text-[10px] text-purple-700 block font-sans">Other Files</span>
                  <span className="text-xl font-black text-purple-700">
                    {extractionResult?.other_files ?? 0}
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
        )}

        {/* Batch Archive Queue Breakdown Table */}
        {isBatch && (
          <div className="mb-8 rounded-2xl border border-[#E2E8F0] bg-white p-5 space-y-3">
            <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
              <FileArchive className="w-4 h-4 text-[#2563EB]" />
              Batch Jobs Execution Breakdown
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Order</th>
                    <th className="py-2.5 px-3">Archive</th>
                    <th className="py-2.5 px-3">Target Folder</th>
                    <th className="py-2.5 px-3">Files Extracted</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {batchJobs.map((job, idx) => {
                    const isSuccess =
                      job.status === "COMPLETED" ||
                      job.status === "FINISHED_NO_CONVERSION" ||
                      (job.status === "EXTRACTED" && isSkipped);
                    const isJobFailed = job.status === "FAILED";

                    return (
                      <tr key={job.id || idx} className="hover:bg-[#F8FAFC]">
                        <td className="py-2.5 px-3 font-mono font-bold text-[#64748B]">
                          #{idx + 1}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-semibold text-[#0F172A] block">{job.file.name}</span>
                          {job.jobId && (
                            <span className="text-[10px] font-mono text-[#64748B]">{job.jobId}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[#2563EB]">
                          Output/{job.folderName}
                        </td>
                        <td className="py-2.5 px-3">
                          {job.extractionResult ? (
                            <span className="text-[11px] text-[#0F172A] font-mono">
                              {job.extractionResult.word_files} Word · {job.extractionResult.existing_pdf_files} PDF · {job.extractionResult.other_files} Other
                            </span>
                          ) : (
                            <span className="text-[#64748B] italic text-[11px]">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          {isSuccess ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Succeeded
                            </span>
                          ) : isJobFailed ? (
                            <div>
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                                <XCircle className="w-3 h-3 text-red-600" /> Failed
                              </span>
                              {job.errorMessage && (
                                <span className="text-[10px] text-red-600 block mt-0.5">
                                  {job.errorMessage}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-[#64748B] font-mono">{job.status}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* File Processing Report Component */}
        <div className="mb-8 p-6 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
          <FileProcessingReport
            extractionSummary={extractionResult}
            conversionSummary={conversionResult}
            batchJobs={batchJobs.length > 0 ? batchJobs : undefined}
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
            <RotateCcw className="w-4 h-4" /> Process Another Batch
          </button>
        </div>
      </div>
    </div>
  );
}
