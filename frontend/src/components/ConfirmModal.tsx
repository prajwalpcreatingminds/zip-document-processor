"use client";

import React from "react";
import { HelpCircle, FileArchive, Folder, ShieldCheck, Play, ArrowLeft } from "lucide-react";

interface ConfirmModalProps {
  zipFileName: string;
  folderName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ConfirmModal({
  zipFileName,
  folderName,
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmModalProps) {
  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="glass-card rounded-2xl p-8 relative overflow-hidden">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-4">
            <HelpCircle className="w-7 h-7" />
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 mb-3">
            Step 3 of 5
          </span>
          <h2 className="text-2xl font-bold text-[#0F172A] tracking-tight">
            Can I continue?
          </h2>
          <p className="text-[#64748B] text-sm mt-1">
            Please confirm the processing parameters before extraction begins.
          </p>
        </div>

        <div className="space-y-4 mb-8">
          <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] border border-blue-200 flex items-center justify-center text-[#2563EB]">
                <FileArchive className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block">ZIP File</span>
                <span className="text-sm font-bold text-[#0F172A] font-mono">{zipFileName}</span>
              </div>
            </div>
            <span className="text-xs text-[#64748B] bg-white border border-[#E2E8F0] px-2.5 py-1 rounded-md">Archived Source</span>
          </div>

          <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] border border-blue-200 flex items-center justify-center text-[#2563EB]">
                <Folder className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block">Destination Folder</span>
                <span className="text-sm font-bold text-[#2563EB] font-mono">{folderName}</span>
              </div>
            </div>
            <span className="text-xs text-[#64748B] bg-white border border-[#E2E8F0] px-2.5 py-1 rounded-md">storage/{folderName}</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#EFF6FF] border border-blue-200 text-blue-900 text-xs flex items-center gap-2.5 mb-8">
          <ShieldCheck className="w-4 h-4 text-[#2563EB] flex-shrink-0" />
          <span>The original ZIP file will be safely preserved inside the destination folder.</span>
        </div>

        <div className="flex items-center justify-between">
          <button
            type="button"
            disabled={isLoading}
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#64748B] hover:text-[#0F172A] font-medium text-sm transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <ArrowLeft className="w-4 h-4" /> Cancel
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className="px-7 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md shadow-emerald-500/20 transition-all flex items-center gap-2 hover:scale-[1.02] disabled:opacity-50"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Extracting...
              </span>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" /> Yes, Continue
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
