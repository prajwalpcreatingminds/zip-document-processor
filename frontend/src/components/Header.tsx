"use client";

import React from "react";
import { Layers, History, UploadCloud, Clock } from "lucide-react";
import { useWorkflow } from "@/context/WorkflowContext";

export function Header() {
  const { unfinishedJobs, requestLeaveWorkflow, currentStep } = useWorkflow();

  return (
    <header className="w-full max-w-5xl mx-auto mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[#E2E8F0] pb-6 pt-2">
      {/* Brand & Logo */}
      <div
        onClick={() => requestLeaveWorkflow("/upload")}
        className="flex items-center gap-3 select-none cursor-pointer group"
      >
        <div className="w-11 h-11 rounded-2xl bg-[#2563EB] group-hover:bg-[#1D4ED8] transition-colors flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
          <Layers className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-black text-[#0F172A] tracking-tight flex items-center gap-2 group-hover:text-blue-600 transition-colors">
            ZIP Document Processor{" "}
            <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-[#EFF6FF] text-[#2563EB] border border-blue-200">
              Pipeline
            </span>
          </h1>
          <p className="text-xs text-[#64748B]">
            End-to-End Archive Extraction &amp; Word-to-PDF Conversion Engine
          </p>
        </div>
      </div>

      {/* Nav Actions */}
      <div className="flex items-center gap-2.5">
        {unfinishedJobs.length > 0 && (
          <button
            type="button"
            onClick={() => requestLeaveWorkflow("/upload")}
            className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-2xs"
            title={`${unfinishedJobs.length} unfinished job(s) available`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Unfinished Jobs</span>
            <span className="px-1.5 py-0.2 rounded-full bg-amber-200 text-amber-900 text-[10px] font-bold">
              {unfinishedJobs.length}
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={() => requestLeaveWorkflow("/upload")}
          className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5 ${
            currentStep === 1
              ? "bg-[#EFF6FF] text-[#2563EB] border-blue-200"
              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
          }`}
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span>New Upload</span>
        </button>

        <button
          type="button"
          onClick={() => requestLeaveWorkflow("/history")}
          className="px-3 py-1.5 rounded-xl bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 text-xs font-semibold transition-all flex items-center gap-1.5"
        >
          <History className="w-3.5 h-3.5" />
          <span>History</span>
        </button>
      </div>
    </header>
  );
}

