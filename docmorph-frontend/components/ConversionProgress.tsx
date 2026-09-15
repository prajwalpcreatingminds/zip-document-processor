"use client";

import React from "react";
import { FileText, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { JobStatusResponse } from "@/types";

interface ConversionProgressProps {
  status: JobStatusResponse | null;
}

export function ConversionProgress({ status }: ConversionProgressProps) {
  const currentIndex = status?.current_index || 0;
  const total = status?.total_to_convert || 1;
  const currentFile = status?.current_file || "Preparing documents...";
  const convertedCount = status?.converted_count || 0;
  const failedCount = status?.failed_count || 0;

  const percentage = Math.min(100, Math.round((currentIndex / total) * 100));

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="glass-card rounded-2xl p-8 relative overflow-hidden">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-[#EFF6FF] border border-blue-200 text-[#2563EB] flex items-center justify-center mx-auto mb-4 relative">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EFF6FF] text-[#2563EB] border border-blue-200 mb-3 animate-pulse">
            Processing Documents
          </span>
          <h2 className="text-2xl font-bold text-[#0F172A] tracking-tight">
            Converting Word documents...
          </h2>
          <p className="text-[#64748B] text-sm mt-1">
            Generating genuine PDF documents and saving them to the PDF folder.
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs font-semibold mb-2">
            <span className="text-[#64748B]">
              {currentIndex} / {total} Document{total === 1 ? "" : "s"}
            </span>
            <span className="text-[#2563EB]">{percentage}%</span>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-[#E2E8F0] p-0.5">
            <div
              className="h-full bg-[#2563EB] rounded-full transition-all duration-300 shadow-sm"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* Current Active File Banner */}
        <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] flex items-center justify-center text-[#2563EB] flex-shrink-0">
            <FileText className="w-5 h-5 animate-pulse" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B] block">
              Currently Converting:
            </span>
            <span className="text-sm font-bold text-[#0F172A] font-mono truncate block">
              {currentFile}
            </span>
          </div>
        </div>

        {/* Mini stats */}
        <div className="grid grid-cols-2 gap-3 text-center text-xs">
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center gap-2 text-emerald-700">
            <CheckCircle2 className="w-4 h-4" />
            <span>Converted: {convertedCount}</span>
          </div>
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center gap-2 text-red-700">
            <AlertCircle className="w-4 h-4" />
            <span>Failed: {failedCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
