"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { HelpCircle, FileArchive, Folder, ShieldCheck, Play, ArrowLeft, Layers, ListOrdered } from "lucide-react";
import { useWorkflow } from "@/context/WorkflowContext";

export default function ConfirmationPage() {
  const router = useRouter();
  const { files, folderMode, folderName, folderMap } = useWorkflow();

  const handleConfirm = () => {
    router.push("/extraction");
  };

  const handleBack = () => {
    router.push("/folder");
  };

  const isSingle = files.length === 1;

  const getArchiveFormat = (filename: string) => {
    return filename.split('.').pop()?.toUpperCase() || "ARCHIVE";
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="glass-card rounded-2xl p-8 sm:p-10 relative overflow-hidden">
        {/* Step Badge & Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
            <HelpCircle className="w-7 h-7" />
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 mb-3">
            Step 3 of 7
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#0F172A] tracking-tight">
            {isSingle ? "Confirmation" : "Review Batch Configuration"}
          </h2>
          <p className="text-[#64748B] text-sm mt-1.5 max-w-md mx-auto">
            {isSingle
              ? "Please verify the extraction and folder details before proceeding."
              : "Please verify the archive queue and folder assignments before sequential processing begins."}
          </p>
        </div>

        {/* Mode Info Pill (Only when 2 or more archives) */}
        {!isSingle && (
          <div className="mb-4 flex items-center justify-between p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs">
            <span className="font-semibold text-[#64748B] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#2563EB]" /> Mode:
            </span>
            <span className="font-bold text-[#2563EB] bg-[#EFF6FF] px-2.5 py-0.5 rounded-full border border-blue-200">
              {folderMode === "SAME" ? `Same Parent Folder (${folderName.trim()})` : `Different Parent Folders (${files.length} folders)`}
            </span>
          </div>
        )}

        {/* Review Table / Cards */}
        <div className="space-y-3 mb-6">
          <span className="text-xs font-bold uppercase tracking-wider text-[#0F172A] flex items-center gap-2">
            <ListOrdered className="w-4 h-4 text-[#2563EB]" />
            {isSingle ? "Processing Summary:" : `Sequential Processing Queue (${files.length} Archives):`}
          </span>

          <div className="rounded-xl border border-[#E2E8F0] bg-white overflow-hidden shadow-2xs max-h-64 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-semibold uppercase tracking-wider text-[10px] z-10">
                <tr>
                  {!isSingle && <th className="py-2.5 px-3">#</th>}
                  <th className="py-2.5 px-3">Archive File</th>
                  <th className="py-2.5 px-3">Format</th>
                  <th className="py-2.5 px-3">Target Folder</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] font-mono">
                {files.map((f, idx) => {
                  const targetF = folderMode === "SAME"
                    ? folderName.trim()
                    : (folderMap[f.name] || f.name.replace(/\.[^/.]+$/, "")).trim();

                  return (
                    <tr key={idx} className="hover:bg-[#F8FAFC] transition-colors">
                      {!isSingle && (
                        <td className="py-2.5 px-3 text-[#64748B] font-sans font-bold">{idx + 1}</td>
                      )}
                      <td className="py-2.5 px-3 text-[#0F172A] font-semibold">
                        <span className="truncate max-w-[150px] block" title={f.name}>
                          {f.name}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {getArchiveFormat(f.name)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[#2563EB] font-sans font-medium">
                        Output/{targetF}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Protection & Sequential Notices */}
        <div className="p-3.5 rounded-xl bg-[#EFF6FF] border border-blue-200 text-blue-900 text-xs flex items-center gap-2.5 mb-8">
          <ShieldCheck className="w-4 h-4 text-[#2563EB] flex-shrink-0" />
          <span>
            {isSingle
              ? "The archive will be safely extracted into organized Word, PDF, and Other categories while preserving the original."
              : "Each archive will be processed independently in sequence, and original archives will be preserved safely."}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            className="px-5 py-2.5 rounded-xl border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#64748B] hover:text-[#0F172A] font-medium text-sm transition-all flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Folders
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            className="px-7 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md shadow-emerald-500/20 transition-all flex items-center gap-2 hover:scale-[1.02]"
          >
            <Play className="w-4 h-4 fill-current" /> Confirm &amp; Start Processing
          </button>
        </div>
      </div>
    </div>
  );
}
