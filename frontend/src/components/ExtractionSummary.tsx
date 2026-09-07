"use client";

import React, { useState } from "react";
import { ExtractionResponse } from "@/types";
import {
  FileText,
  FileCheck2,
  AlertTriangle,
  Folder,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface ExtractionSummaryProps {
  summary: ExtractionResponse;
  onConfirmConvert: () => void;
  onFinishWithoutConvert: () => void;
  isLoading?: boolean;
}

export function ExtractionSummary({
  summary,
  onConfirmConvert,
  onFinishWithoutConvert,
  isLoading = false,
}: ExtractionSummaryProps) {
  const [showWordList, setShowWordList] = useState(false);
  const [showPdfList, setShowPdfList] = useState(false);
  const [showUnsupportedList, setShowUnsupportedList] = useState(false);

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      <div className="glass-card rounded-2xl p-8">
        <div className="text-center mb-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-3">
            Extraction Completed
          </span>
          <h2 className="text-2xl font-bold text-[#0F172A] tracking-tight">
            Files Extracted &amp; Categorized
          </h2>
          <p className="text-[#64748B] text-sm mt-1">
            All supported files from <span className="font-mono text-[#0F172A] font-semibold">{summary.original_zip}</span> have been placed in their respective folders.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-center">
            <span className="text-[11px] font-semibold text-[#64748B] uppercase block">Total Supported</span>
            <span className="text-2xl font-black text-[#0F172A] mt-1 block">{summary.total_supported_files}</span>
          </div>

          <div className="p-4 rounded-xl bg-[#EFF6FF] border border-blue-200 text-center">
            <span className="text-[11px] font-semibold text-[#2563EB] uppercase block">Word Files</span>
            <span className="text-2xl font-black text-[#2563EB] mt-1 block">{summary.word_files}</span>
            <span className="text-[10px] text-[#64748B]">.doc / .docx</span>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
            <span className="text-[11px] font-semibold text-emerald-700 uppercase block">Existing PDFs</span>
            <span className="text-2xl font-black text-emerald-700 mt-1 block">{summary.existing_pdf_files}</span>
            <span className="text-[10px] text-[#64748B]">.pdf in ZIP</span>
          </div>

          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-center">
            <span className="text-[11px] font-semibold text-amber-700 uppercase block">Unsupported</span>
            <span className="text-2xl font-black text-amber-700 mt-1 block">{summary.unsupported_files}</span>
            <span className="text-[10px] text-[#64748B]">Skipped</span>
          </div>
        </div>

        {/* Folder Paths */}
        <div className="space-y-2 mb-6 text-xs font-mono">
          <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between">
            <span className="text-[#64748B] flex items-center gap-2">
              <Folder className="w-4 h-4 text-[#2563EB]" /> Word Folder:
            </span>
            <span className="text-[#2563EB] font-semibold">{summary.folder_name}/Word/</span>
          </div>
          <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between">
            <span className="text-[#64748B] flex items-center gap-2">
              <Folder className="w-4 h-4 text-emerald-600" /> PDF Folder:
            </span>
            <span className="text-emerald-700 font-semibold">{summary.folder_name}/PDF/</span>
          </div>
        </div>

        {/* File Previews / Accordions */}
        <div className="space-y-2 mb-8">
          {summary.word_file_list.length > 0 && (
            <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] overflow-hidden">
              <button
                type="button"
                onClick={() => setShowWordList(!showWordList)}
                className="w-full p-3 flex items-center justify-between text-xs font-semibold text-[#0F172A] hover:bg-slate-100"
              >
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#2563EB]" />
                  Extracted Word Files ({summary.word_file_list.length})
                </span>
                {showWordList ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showWordList && (
                <div className="p-3 border-t border-[#E2E8F0] space-y-1 bg-white max-h-40 overflow-y-auto font-mono text-[11px] text-[#0F172A]">
                  {summary.word_file_list.map((name, i) => (
                    <div key={i} className="flex items-center gap-2 py-0.5">
                      <span className="text-[#64748B]">{i + 1}.</span>
                      <span className="text-blue-700">{name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {summary.existing_pdf_list.length > 0 && (
            <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] overflow-hidden">
              <button
                type="button"
                onClick={() => setShowPdfList(!showPdfList)}
                className="w-full p-3 flex items-center justify-between text-xs font-semibold text-[#0F172A] hover:bg-slate-100"
              >
                <span className="flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-emerald-600" />
                  Existing PDF Files ({summary.existing_pdf_list.length})
                </span>
                {showPdfList ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showPdfList && (
                <div className="p-3 border-t border-[#E2E8F0] space-y-1 bg-white max-h-40 overflow-y-auto font-mono text-[11px] text-[#0F172A]">
                  {summary.existing_pdf_list.map((name, i) => (
                    <div key={i} className="flex items-center gap-2 py-0.5">
                      <span className="text-[#64748B]">{i + 1}.</span>
                      <span className="text-emerald-700">{name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {summary.unsupported_file_list.length > 0 && (
            <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] overflow-hidden">
              <button
                type="button"
                onClick={() => setShowUnsupportedList(!showUnsupportedList)}
                className="w-full p-3 flex items-center justify-between text-xs font-semibold text-[#0F172A] hover:bg-slate-100"
              >
                <span className="flex items-center gap-2 text-amber-700">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Unsupported / Skipped Files ({summary.unsupported_file_list.length})
                </span>
                {showUnsupportedList ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showUnsupportedList && (
                <div className="p-3 border-t border-[#E2E8F0] space-y-1 bg-white max-h-40 overflow-y-auto font-mono text-[11px] text-amber-800">
                  {summary.unsupported_file_list.map((name, i) => (
                    <div key={i} className="flex items-center gap-2 py-0.5">
                      <span className="text-[#64748B]">{i + 1}.</span>
                      <span>{name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Step 6: Conversion Confirmation Prompt Card */}
        <div className="p-6 rounded-2xl bg-[#EFF6FF] border border-blue-200">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center text-[#2563EB] flex-shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-[#0F172A]">
                Would you like to convert the existing Word files to PDF?
              </h3>
              <p className="text-xs text-[#64748B] mt-1">
                You have <span className="font-bold text-[#2563EB]">{summary.word_files} Word document{summary.word_files === 1 ? "" : "s"}</span> ({summary.word_file_list.slice(0, 3).join(", ")}{summary.word_file_list.length > 3 ? "..." : ""}). Converted PDFs will be placed in the <span className="font-mono text-emerald-700 font-semibold">{summary.folder_name}/PDF/</span> folder. Original Word documents will remain untouched.
              </p>

              <div className="mt-6 flex items-center gap-3">
                <button
                  type="button"
                  disabled={isLoading || summary.word_files === 0}
                  onClick={onConfirmConvert}
                  className="px-6 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-sm shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 hover:scale-[1.02] disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" /> Yes, Convert ({summary.word_files})
                </button>

                <button
                  type="button"
                  disabled={isLoading}
                  onClick={onFinishWithoutConvert}
                  className="px-5 py-2.5 rounded-xl border border-[#E2E8F0] hover:bg-white text-[#64748B] hover:text-[#0F172A] font-medium text-sm transition-all"
                >
                  No, Finish
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
