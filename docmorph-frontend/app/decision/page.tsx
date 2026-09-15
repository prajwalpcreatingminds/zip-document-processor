"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, FileText, ArrowRight, ArrowLeft, XCircle, Info, FileArchive } from "lucide-react";
import { useWorkflow } from "@/context/WorkflowContext";

export default function DecisionPage() {
  const router = useRouter();
  const { batchJobs, extractionResult, chooseConversion, folderName, files } = useWorkflow();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Aggregate word count across batch jobs or fallback to extractionResult
  const totalWordCount = batchJobs.length > 0
    ? batchJobs.reduce((sum, j) => sum + (j.extractionResult?.word_files || 0), 0)
    : (extractionResult?.word_files || 0);

  const handleDecision = async (decision: "YES" | "NO") => {
    setIsSubmitting(true);
    await chooseConversion(decision);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="glass-card rounded-2xl p-8 sm:p-10 relative overflow-hidden">
        {/* Step Badge & Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-3xl bg-[#EFF6FF] border border-blue-200 text-[#2563EB] flex items-center justify-center mx-auto mb-4 shadow-sm">
            <Sparkles className="w-8 h-8" />
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EFF6FF] text-[#2563EB] border border-blue-200 mb-3">
            Step 5 of 7
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#0F172A] tracking-tight">
            Convert Discovered Word Documents?
          </h2>
          <p className="text-[#64748B] text-sm mt-2 max-w-md mx-auto">
            <span className="font-bold text-[#2563EB]">{totalWordCount} Word document{totalWordCount === 1 ? "" : "s"}</span> found across {files.length} archive{files.length === 1 ? "" : "s"}.
          </p>
        </div>

        {/* Word Document Preview Card */}
        <div className="p-5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#0F172A] flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#2563EB]" /> Discovered Word Documents:
            </span>
            <span className="text-xs font-bold text-[#2563EB] bg-[#EFF6FF] px-2.5 py-0.5 rounded-full border border-blue-200">
              {totalWordCount} file{totalWordCount === 1 ? "" : "s"}
            </span>
          </div>

          <div className="max-h-44 overflow-y-auto space-y-2 font-mono text-xs text-[#0F172A] pr-1">
            {batchJobs.length > 0 ? (
              batchJobs.map((job, jIdx) => {
                const jobWordFiles = job.extractionResult?.word_file_list || [];
                if (jobWordFiles.length === 0) return null;
                return (
                  <div key={jIdx} className="space-y-1">
                    <div className="text-[11px] font-sans font-bold text-[#64748B] flex items-center gap-1.5 pt-1">
                      <FileArchive className="w-3.5 h-3.5 text-[#2563EB]" />
                      <span>{job.file.name} (Output/{job.folderName}):</span>
                    </div>
                    {jobWordFiles.map((wf: string, fIdx: number) => (
                      <div key={fIdx} className="flex items-center gap-2 py-1 px-2.5 rounded-lg bg-white border border-[#E2E8F0]">
                        <span className="text-[#64748B] w-4">{fIdx + 1}.</span>
                        <span className="text-blue-700 truncate">{wf}</span>
                      </div>
                    ))}
                  </div>
                );
              })
            ) : extractionResult && extractionResult.word_file_list.length > 0 ? (
              extractionResult.word_file_list.map((filename: string, i: number) => (
                <div key={i} className="flex items-center gap-2 py-1 px-2.5 rounded-lg bg-white border border-[#E2E8F0]">
                  <span className="text-[#64748B] w-4">{i + 1}.</span>
                  <span className="text-blue-700 truncate">{filename}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-[#64748B] italic">No Word documents found in archive batch.</p>
            )}
          </div>
        </div>

        {/* Policy Notice */}
        <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#64748B] space-y-1 mb-8">
          <div className="flex items-center gap-2 text-[#0F172A] font-semibold">
            <Info className="w-4 h-4 text-[#2563EB]" /> Conversion Behavior:
          </div>
          <p className="pl-6 text-[11px]">
            • Converted PDFs will be placed in each archive's respective <span className="font-mono text-emerald-700 font-semibold">PDF/</span> directory.
          </p>
          <p className="pl-6 text-[11px]">
            • Original Word documents will remain intact in each archive's <span className="font-mono text-[#2563EB] font-semibold">Word/</span> directory.
          </p>
          <p className="pl-6 text-[11px]">
            • Existing PDFs inside archives will be preserved untouched.
          </p>
        </div>

        {/* Action Decision Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[#E2E8F0]">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleDecision("NO")}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#64748B] hover:text-[#0F172A] font-medium text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <XCircle className="w-4 h-4 text-[#64748B]" />
            No, Skip Conversion
          </button>

          <button
            type="button"
            disabled={isSubmitting || totalWordCount === 0}
            onClick={() => handleDecision("YES")}
            className="w-full sm:w-auto px-8 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-sm shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            <Sparkles className="w-4 h-4" />
            Yes, Convert to PDF ({totalWordCount})
          </button>
        </div>
      </div>
    </div>
  );
}
