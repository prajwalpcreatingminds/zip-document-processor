"use client";

import React, { useState, useMemo } from "react";
import {
  FileText,
  FileCheck2,
  AlertTriangle,
  Download,
  CheckCircle2,
  XCircle,
  FileMinus,
} from "lucide-react";
import { ConversionResponse, ExtractionResponse } from "@/types";

export interface FileReportItem {
  fileName: string;
  type: "Word" | "PDF" | "Unsupported";
  status: "Converted" | "Existing" | "Skipped" | "Failed";
  pdfFileName?: string | null;
  errorMessage?: string | null;
  processedAt?: string;
}

interface FileProcessingReportProps {
  extractionSummary: ExtractionResponse | null;
  conversionSummary: ConversionResponse | null;
  noConversion?: boolean;
}

type FilterType = "ALL" | "WORD" | "PDF" | "CONVERTED" | "FAILED" | "UNSUPPORTED";

export function FileProcessingReport({
  extractionSummary,
  conversionSummary,
  noConversion = false,
}: FileProcessingReportProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Build the complete list of files processed
  const reportItems: FileReportItem[] = useMemo(() => {
    const items: FileReportItem[] = [];
    const now = new Date().toISOString();

    // 1. Word Documents
    if (noConversion || !conversionSummary) {
      // User skipped conversion
      extractionSummary?.word_file_list.forEach((name) => {
        items.push({
          fileName: name,
          type: "Word",
          status: "Skipped",
          pdfFileName: "—",
          processedAt: now,
        });
      });
    } else {
      // Converted files
      conversionSummary.converted_files.forEach((c) => {
        items.push({
          fileName: c.word_filename,
          type: "Word",
          status: "Converted",
          pdfFileName: c.pdf_filename || `${c.word_filename.replace(/\.[^/.]+$/, ".pdf")}`,
          processedAt: now,
        });
      });

      // Failed conversion files
      conversionSummary.failed_files.forEach((f) => {
        items.push({
          fileName: f.word_filename,
          type: "Word",
          status: "Failed",
          pdfFileName: "—",
          errorMessage: f.error_message || "Conversion failed",
          processedAt: now,
        });
      });
    }

    // 2. Existing PDFs
    extractionSummary?.existing_pdf_list.forEach((name) => {
      items.push({
        fileName: name,
        type: "PDF",
        status: "Existing",
        pdfFileName: "—",
        processedAt: now,
      });
    });

    // 3. Unsupported Files
    extractionSummary?.unsupported_file_list.forEach((name) => {
      items.push({
        fileName: name,
        type: "Unsupported",
        status: "Skipped",
        pdfFileName: "—",
        processedAt: now,
      });
    });

    return items;
  }, [extractionSummary, conversionSummary, noConversion]);

  // Filter items
  const filteredItems = useMemo(() => {
    return reportItems.filter((item) => {
      // Filter tab
      if (activeFilter === "WORD" && item.type !== "Word") return false;
      if (activeFilter === "PDF" && item.type !== "PDF") return false;
      if (activeFilter === "CONVERTED" && item.status !== "Converted") return false;
      if (activeFilter === "FAILED" && item.status !== "Failed") return false;
      if (activeFilter === "UNSUPPORTED" && item.type !== "Unsupported") return false;

      // Search query
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        return (
          item.fileName.toLowerCase().includes(query) ||
          (item.pdfFileName && item.pdfFileName.toLowerCase().includes(query)) ||
          item.status.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [reportItems, activeFilter, searchTerm]);

  // Export CSV
  const handleDownloadCsv = () => {
    const headers = ["File Name", "Type", "Status", "PDF File", "Processed At"];
    const rows = reportItems.map((item) => [
      `"${item.fileName.replace(/"/g, '""')}"`,
      `"${item.type}"`,
      `"${item.status}"`,
      `"${item.pdfFileName || "—"}"`,
      `"${item.processedAt || new Date().toISOString()}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `processing_report_${extractionSummary?.folder_name || "documents"}_${Date.now()}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: FileReportItem["status"]) => {
    switch (status) {
      case "Converted":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Converted
          </span>
        );
      case "Existing":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2563EB] bg-[#EFF6FF] px-2.5 py-0.5 rounded-full border border-blue-200">
            <FileCheck2 className="w-3 h-3 text-[#2563EB]" /> Existing PDF
          </span>
        );
      case "Failed":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200">
            <XCircle className="w-3 h-3 text-red-600" /> Failed
          </span>
        );
      case "Skipped":
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#64748B] bg-slate-100 px-2.5 py-0.5 rounded-full border border-[#E2E8F0]">
            <FileMinus className="w-3 h-3" /> Skipped
          </span>
        );
    }
  };

  const getTypeBadge = (type: FileReportItem["type"]) => {
    switch (type) {
      case "Word":
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700">
            <FileText className="w-3.5 h-3.5 text-[#2563EB]" /> Word
          </span>
        );
      case "PDF":
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
            <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" /> PDF
          </span>
        );
      case "Unsupported":
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Unsupported
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & CSV Download Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-[#0F172A] tracking-tight flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#2563EB]" />
            File Processing Report
          </h3>
          <p className="text-xs text-[#64748B]">
            Detailed status breakdown for all {reportItems.length} archive entries.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownloadCsv}
          className="px-4 py-2 rounded-xl bg-[#EFF6FF] hover:bg-blue-100 border border-blue-200 text-[#2563EB] text-xs font-semibold transition-all flex items-center gap-2 shadow-2xs"
        >
          <Download className="w-3.5 h-3.5" />
          Download Report (CSV)
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 pb-2">
        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
          {(
            [
              { id: "ALL", label: "All", count: reportItems.length },
              { id: "WORD", label: "Word", count: reportItems.filter((i) => i.type === "Word").length },
              { id: "PDF", label: "PDF", count: reportItems.filter((i) => i.type === "PDF").length },
              { id: "CONVERTED", label: "Converted", count: reportItems.filter((i) => i.status === "Converted").length },
              { id: "FAILED", label: "Failed", count: reportItems.filter((i) => i.status === "Failed").length },
              { id: "UNSUPPORTED", label: "Unsupported", count: reportItems.filter((i) => i.type === "Unsupported").length },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilter(tab.id)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeFilter === tab.id
                  ? "bg-[#2563EB] text-white shadow-xs"
                  : "text-[#64748B] hover:text-[#0F172A] hover:bg-white"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeFilter === tab.id ? "bg-white/20 text-white" : "bg-slate-200 text-[#64748B]"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[200px]">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search files..."
            className="w-full px-3.5 py-1.5 rounded-xl bg-white border border-[#E2E8F0] focus:border-[#2563EB] text-xs text-[#0F172A] placeholder:text-slate-400 outline-none"
          />
        </div>
      </div>

      {/* Report Table */}
      <div className="rounded-xl border border-[#E2E8F0] bg-white overflow-hidden shadow-2xs">
        <div className="overflow-x-auto max-h-80 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-semibold uppercase tracking-wider text-[10px] z-10">
              <tr>
                <th className="py-3 px-4">File Name</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Generated PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] font-mono">
              {filteredItems.length > 0 ? (
                filteredItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-2.5 px-4 text-[#0F172A] font-medium">
                      <span className="truncate max-w-xs block" title={item.fileName}>
                        {item.fileName}
                      </span>
                      {item.errorMessage && (
                        <span className="text-[10px] text-red-600 block font-sans mt-0.5">
                          Error: {item.errorMessage}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 font-sans">{getTypeBadge(item.type)}</td>
                    <td className="py-2.5 px-4 font-sans">{getStatusBadge(item.status)}</td>
                    <td className="py-2.5 px-4 text-[#0F172A]">
                      {item.pdfFileName && item.pdfFileName !== "—" ? (
                        <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                          <FileCheck2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          <span className="truncate max-w-xs">{item.pdfFileName}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-[#64748B] font-sans italic text-xs">
                    No matching files found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
