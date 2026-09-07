"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { HelpCircle, FileArchive, Folder, ShieldCheck, Play, ArrowLeft } from "lucide-react";
import { useWorkflow } from "@/context/WorkflowContext";

export default function ConfirmationPage() {
  const router = useRouter();
  const { file, folderName } = useWorkflow();

  const handleConfirm = () => {
    router.push("/extraction");
  };

  const handleBack = () => {
    router.push("/folder");
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
            Can I continue?
          </h2>
          <p className="text-[#64748B] text-sm mt-1.5 max-w-md mx-auto">
            Please review the extraction parameters before we organize your documents.
          </p>
        </div>

        {/* Summary Parameters Card */}
        <div className="space-y-4 mb-8">
          <div className="p-4 sm:p-5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] border border-blue-200 flex items-center justify-center text-[#2563EB] flex-shrink-0">
                <FileArchive className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block">
                  ZIP File:
                </span>
                <span className="text-sm font-bold text-[#0F172A] font-mono truncate block">
                  {file?.name || "archive.zip"}
                </span>
              </div>
            </div>
            <span className="text-xs text-[#64748B] bg-white px-2.5 py-1 rounded-md border border-[#E2E8F0] flex-shrink-0">
              Source Archive
            </span>
          </div>

          <div className="p-4 sm:p-5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] border border-blue-200 flex items-center justify-center text-[#2563EB] flex-shrink-0">
                <Folder className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block">
                  Target Folder:
                </span>
                <span className="text-sm font-bold text-[#2563EB] font-mono truncate block">
                  {folderName || "job description"}
                </span>
              </div>
            </div>
            <span className="text-xs text-[#64748B] bg-white px-2.5 py-1 rounded-md border border-[#E2E8F0] flex-shrink-0 font-mono">
              Output/{folderName}
            </span>
          </div>
        </div>

        {/* Safe Protection Notice */}
        <div className="p-3.5 rounded-xl bg-[#EFF6FF] border border-blue-200 text-blue-900 text-xs flex items-center gap-2.5 mb-8">
          <ShieldCheck className="w-4 h-4 text-[#2563EB] flex-shrink-0" />
          <span>The original ZIP file will be safely preserved inside the destination folder.</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            className="px-5 py-2.5 rounded-xl border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#64748B] hover:text-[#0F172A] font-medium text-sm transition-all flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            className="px-7 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md shadow-emerald-500/20 transition-all flex items-center gap-2 hover:scale-[1.02]"
          >
            <Play className="w-4 h-4 fill-current" /> Confirm &amp; Continue
          </button>
        </div>
      </div>
    </div>
  );
}
