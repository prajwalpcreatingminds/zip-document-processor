"use client";

import React, { useEffect } from "react";
import confetti from "canvas-confetti";
import { ConversionResponse, ExtractionResponse, FileTreeNode } from "@/types";
import {
  CheckCircle2,
  AlertCircle,
  Folder,
  FileText,
  FileCheck2,
  FileArchive,
  RotateCcw,
  Database,
  Layers,
  Sparkles,
} from "lucide-react";

interface ResultDashboardProps {
  conversionSummary?: ConversionResponse | null;
  extractionSummary?: ExtractionResponse | null;
  noConversion?: boolean;
  onReset: () => void;
  onViewHistory: () => void;
}

export function ResultDashboard({
  conversionSummary,
  extractionSummary,
  noConversion = false,
  onReset,
  onViewHistory,
}: ResultDashboardProps) {
  useEffect(() => {
    if (!noConversion && conversionSummary && conversionSummary.successfully_converted > 0) {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  }, [noConversion, conversionSummary]);

  const folderName = conversionSummary?.folder_name || extractionSummary?.folder_name || "Job Folder";
  const originalZip = extractionSummary?.original_zip || "archive.zip";

  const renderFileTreeNode = (node: FileTreeNode, depth = 0) => {
    const isFolder = node.type === "folder";
    const indentClass = depth === 0 ? "" : depth === 1 ? "pl-5" : "pl-10";

    return (
      <div key={node.name} className={`${indentClass} py-0.5`}>
        <div className="flex items-center gap-2 text-xs font-mono">
          {isFolder ? (
            <Folder
              className={`w-3.5 h-3.5 ${
                depth === 0 ? "text-[#2563EB]" : node.name === "Word" ? "text-blue-600" : "text-emerald-600"
              }`}
            />
          ) : node.name.toLowerCase().endsWith(".zip") ? (
            <FileArchive className="w-3.5 h-3.5 text-amber-600" />
          ) : node.name.toLowerCase().endsWith(".pdf") ? (
            <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
          ) : (
            <FileText className="w-3.5 h-3.5 text-blue-600" />
          )}
          <span
            className={`${
              isFolder
                ? "font-semibold text-[#0F172A]"
                : node.name.toLowerCase().endsWith(".pdf")
                ? "text-emerald-700"
                : node.name.toLowerCase().endsWith(".zip")
                ? "text-amber-700"
                : "text-blue-700"
            }`}
          >
            {node.name}
            {isFolder ? "/" : ""}
          </span>
        </div>
        {node.children && node.children.map((child) => renderFileTreeNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="glass-card rounded-2xl p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-3">
            {noConversion ? "Extraction Finished" : "Processing Completed"}
          </span>
          <h2 className="text-3xl font-extrabold text-[#0F172A] tracking-tight">
            {noConversion ? "Documents Extracted Successfully" : "Conversion & Extraction Summary"}
          </h2>
          <p className="text-[#64748B] text-sm mt-1">
            Folder <span className="font-mono text-[#2563EB] font-semibold">{folderName}</span> is fully structured and ready on disk.
          </p>
        </div>

        {/* Section 14 Accurate File Count Breakdown */}
        {!noConversion && conversionSummary && (
          <div className="mb-8">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#2563EB]" />
              Document Count Breakdown (Word &amp; PDF)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                <span className="text-[11px] font-semibold text-[#64748B] uppercase block">Word Files</span>
                <span className="text-2xl font-black text-[#2563EB] mt-1 block">
                  {conversionSummary.word_files_found}
                </span>
                <span className="text-[10px] text-[#64748B]">In {folderName}/Word/</span>
              </div>

              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                <span className="text-[11px] font-semibold text-[#64748B] uppercase block">Existing PDFs</span>
                <span className="text-2xl font-black text-emerald-600 mt-1 block">
                  {conversionSummary.existing_pdf_count}
                </span>
                <span className="text-[10px] text-[#64748B]">Already in ZIP</span>
              </div>

              <div className="p-4 rounded-xl bg-[#EFF6FF] border border-blue-200">
                <span className="text-[11px] font-semibold text-blue-700 uppercase block">Converted PDFs</span>
                <span className="text-2xl font-black text-[#2563EB] mt-1 block">
                  {conversionSummary.converted_pdf_count}
                </span>
                <span className="text-[10px] text-blue-600">From Word Docs</span>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="text-[11px] font-semibold text-emerald-700 uppercase block">Total PDF Folder</span>
                <span className="text-2xl font-black text-emerald-600 mt-1 block">
                  {conversionSummary.total_pdf_count}
                </span>
                <span className="text-[10px] text-emerald-700">Existing + Converted</span>
              </div>
            </div>
          </div>
        )}

        {/* Conversion Result Status */}
        {!noConversion && conversionSummary && (
          <div className="mb-8">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              Conversion Results
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                <span className="text-[11px] text-[#64748B] block">Word Files Found</span>
                <span className="text-xl font-bold text-[#0F172A] mt-1 block">{conversionSummary.word_files_found}</span>
              </div>
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="text-[11px] text-emerald-700 block">Successfully Converted</span>
                <span className="text-xl font-bold text-emerald-600 mt-1 block">
                  {conversionSummary.successfully_converted}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-red-50 border border-red-200">
                <span className="text-[11px] text-red-700 block">Failed Files</span>
                <span className="text-xl font-bold text-red-600 mt-1 block">
                  {conversionSummary.failed_files_count}
                </span>
              </div>
            </div>

            {/* Error details if any */}
            {conversionSummary.failed_files.length > 0 && (
              <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200 space-y-2">
                <span className="text-xs font-bold text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> Failed Conversion Files:
                </span>
                {conversionSummary.failed_files.map((file, idx) => (
                  <div key={idx} className="text-xs text-red-600 font-mono pl-6">
                    • <span className="font-bold">{file.word_filename}</span>: {file.error_message || "Unknown error"}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Directory File Tree View */}
        <div className="mb-8">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-3 flex items-center gap-2">
            <Folder className="w-4 h-4 text-[#2563EB]" />
            Extracted &amp; Organized Directory Tree
          </h3>
          <div className="p-5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] max-h-64 overflow-y-auto">
            {conversionSummary?.file_tree ? (
              renderFileTreeNode(conversionSummary.file_tree)
            ) : (
              <div className="font-mono text-xs text-[#0F172A] space-y-1">
                <div className="flex items-center gap-2 text-[#2563EB] font-semibold">
                  <Folder className="w-4 h-4" /> storage/{folderName}/
                </div>
                <div className="pl-5 text-amber-700 flex items-center gap-2">
                  <FileArchive className="w-3.5 h-3.5 text-amber-600" /> {originalZip} (Preserved)
                </div>
                <div className="pl-5 text-blue-700 flex items-center gap-2">
                  <Folder className="w-3.5 h-3.5 text-[#2563EB]" /> Word/ ({extractionSummary?.word_files || 0} files)
                </div>
                <div className="pl-5 text-emerald-700 flex items-center gap-2">
                  <Folder className="w-3.5 h-3.5 text-emerald-600" /> PDF/ ({extractionSummary?.existing_pdf_files || 0} files)
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#E2E8F0]">
          <button
            type="button"
            onClick={onViewHistory}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#64748B] hover:text-[#0F172A] font-medium text-sm transition-all flex items-center justify-center gap-2"
          >
            <Database className="w-4 h-4 text-[#2563EB]" /> View MongoDB History
          </button>

          <button
            type="button"
            onClick={onReset}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-sm shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 hover:scale-[1.02]"
          >
            <RotateCcw className="w-4 h-4" /> Process Another ZIP File
          </button>
        </div>
      </div>
    </div>
  );
}
