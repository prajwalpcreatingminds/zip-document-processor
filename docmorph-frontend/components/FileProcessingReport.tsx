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
  Folder,
  Eye,
} from "lucide-react";
import { ConversionResponse, ExtractionResponse, BatchJobItem } from "@/types";
import { viewPdf } from "@/lib/api";
import { PdfViewerModal } from "@/components/PdfViewerModal";

export interface FileReportItem {
  jobId?: string;
  archiveName?: string;
  folderName?: string;
  fileName: string;
  type: "Word" | "PDF" | "Other" | "Unsupported";
  status: "Converted" | "Existing" | "Retained" | "Skipped" | "Failed";
  pdfFileName?: string | null;
  errorMessage?: string | null;
  processedAt?: string;
}

interface FileProcessingReportProps {
  extractionSummary: ExtractionResponse | null;
  conversionSummary: ConversionResponse | null;
  batchJobs?: BatchJobItem[];
  noConversion?: boolean;
}

type FilterType = "ALL" | "WORD" | "PDF" | "OTHER" | "CONVERTED" | "FAILED" | "UNSUPPORTED";

export function FileProcessingReport({
  extractionSummary,
  conversionSummary,
  batchJobs,
  noConversion = false,
}: FileProcessingReportProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedArchiveFilter, setSelectedArchiveFilter] = useState<string>("ALL");

  // PDF Viewer Modal state
  const [previewState, setPreviewState] = useState<{
    isOpen: boolean;
    jobId: string | null;
    filename: string | null;
    base64Data: string | null;
    sizeBytes: number | null;
    isLoading: boolean;
    errorMessage: string | null;
  }>({
    isOpen: false,
    jobId: null,
    filename: null,
    base64Data: null,
    sizeBytes: null,
    isLoading: false,
    errorMessage: null,
  });

  const handleOpenPdfPreview = async (jobId?: string, filename?: string | null) => {
    if (!filename || filename === "—") return;
    const targetJobId = jobId || extractionSummary?.job_id || conversionSummary?.job_id;
    if (!targetJobId) {
      setPreviewState({
        isOpen: true,
        jobId: null,
        filename,
        base64Data: null,
        sizeBytes: null,
        isLoading: false,
        errorMessage: "Job identifier not found for this document.",
      });
      return;
    }

    setPreviewState({
      isOpen: true,
      jobId: targetJobId,
      filename,
      base64Data: null,
      sizeBytes: null,
      isLoading: true,
      errorMessage: null,
    });

    try {
      const res = await viewPdf(targetJobId, filename);
      setPreviewState((prev) => ({
        ...prev,
        isLoading: false,
        base64Data: res.base64_data,
        sizeBytes: res.size_bytes,
        errorMessage: null,
      }));
    } catch (err: any) {
      setPreviewState((prev) => ({
        ...prev,
        isLoading: false,
        errorMessage: err.message || "Failed to load PDF preview from server.",
      }));
    }
  };

  const handleClosePdfPreview = () => {
    setPreviewState({
      isOpen: false,
      jobId: null,
      filename: null,
      base64Data: null,
      sizeBytes: null,
      isLoading: false,
      errorMessage: null,
    });
  };

  // Build the complete list of files processed
  const reportItems: FileReportItem[] = useMemo(() => {
    const items: FileReportItem[] = [];
    const now = new Date().toISOString();

    if (batchJobs && batchJobs.length > 0) {
      // Aggregate across all batch jobs
      batchJobs.forEach((job) => {
        const ext = job.extractionResult;
        const conv = job.conversionResult;
        const archName = job.file?.name || "archive";
        const targetDir = job.folderName;
        const jId = job.jobId || job.id;

        if (job.status === "FAILED" && !ext) {
          // Extraction failed completely
          items.push({
            jobId: jId,
            archiveName: archName,
            folderName: targetDir,
            fileName: `[Archive] ${archName}`,
            type: "Unsupported",
            status: "Failed",
            pdfFileName: "—",
            errorMessage: job.errorMessage || "Archive extraction failed",
            processedAt: now,
          });
          return;
        }

        // 1. Word Documents
        if (noConversion || !conv) {
          ext?.word_file_list.forEach((name) => {
            items.push({
              jobId: jId,
              archiveName: archName,
              folderName: targetDir,
              fileName: name,
              type: "Word",
              status: "Skipped",
              pdfFileName: "—",
              processedAt: now,
            });
          });
        } else {
          conv.converted_files.forEach((c) => {
            items.push({
              jobId: jId,
              archiveName: archName,
              folderName: targetDir,
              fileName: c.word_filename,
              type: "Word",
              status: "Converted",
              pdfFileName: c.pdf_filename || `${c.word_filename.replace(/\.[^/.]+$/, ".pdf")}`,
              processedAt: now,
            });
          });

          conv.failed_files.forEach((f) => {
            items.push({
              jobId: jId,
              archiveName: archName,
              folderName: targetDir,
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
        ext?.existing_pdf_list.forEach((name) => {
          items.push({
            jobId: jId,
            archiveName: archName,
            folderName: targetDir,
            fileName: name,
            type: "PDF",
            status: "Existing",
            pdfFileName: name,
            processedAt: now,
          });
        });

        // 3. Other Retained Files
        ext?.other_file_list?.forEach((name) => {
          items.push({
            jobId: jId,
            archiveName: archName,
            folderName: targetDir,
            fileName: name,
            type: "Other",
            status: "Retained",
            pdfFileName: "—",
            processedAt: now,
          });
        });

        // 4. Unsupported / Skipped Files
        ext?.unsupported_file_list?.forEach((name) => {
          items.push({
            jobId: jId,
            archiveName: archName,
            folderName: targetDir,
            fileName: name,
            type: "Unsupported",
            status: "Skipped",
            pdfFileName: "—",
            processedAt: now,
          });
        });
      });
      return items;
    }

    // Fallback single-archive handling
    const singleJobId = extractionSummary?.job_id || conversionSummary?.job_id;

    // 1. Word Documents
    if (noConversion || !conversionSummary) {
      extractionSummary?.word_file_list.forEach((name) => {
        items.push({
          jobId: singleJobId,
          fileName: name,
          type: "Word",
          status: "Skipped",
          pdfFileName: "—",
          processedAt: now,
        });
      });
    } else {
      conversionSummary.converted_files.forEach((c) => {
        items.push({
          jobId: singleJobId,
          fileName: c.word_filename,
          type: "Word",
          status: "Converted",
          pdfFileName: c.pdf_filename || `${c.word_filename.replace(/\.[^/.]+$/, ".pdf")}`,
          processedAt: now,
        });
      });

      conversionSummary.failed_files.forEach((f) => {
        items.push({
          jobId: singleJobId,
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
        jobId: singleJobId,
        fileName: name,
        type: "PDF",
        status: "Existing",
        pdfFileName: name,
        processedAt: now,
      });
    });

    // 3. Other Retained Files
    extractionSummary?.other_file_list?.forEach((name) => {
      items.push({
        jobId: singleJobId,
        fileName: name,
        type: "Other",
        status: "Retained",
        pdfFileName: "—",
        processedAt: now,
      });
    });

    // 4. Unsupported / Skipped Files
    extractionSummary?.unsupported_file_list?.forEach((name) => {
      items.push({
        jobId: singleJobId,
        fileName: name,
        type: "Unsupported",
        status: "Skipped",
        pdfFileName: "—",
        processedAt: now,
      });
    });

    return items;
  }, [batchJobs, extractionSummary, conversionSummary, noConversion]);

  // Distinct archive names for archive filtering
  const distinctArchives = useMemo(() => {
    if (!batchJobs || batchJobs.length <= 1) return [];
    return Array.from(new Set(batchJobs.map((j) => j.file.name)));
  }, [batchJobs]);

  // Filter items
  const filteredItems = useMemo(() => {
    return reportItems.filter((item) => {
      // Archive filter
      if (selectedArchiveFilter !== "ALL" && item.archiveName && item.archiveName !== selectedArchiveFilter) {
        return false;
      }

      // Filter tab
      if (activeFilter === "WORD" && item.type !== "Word") return false;
      if (activeFilter === "PDF" && item.type !== "PDF") return false;
      if (activeFilter === "OTHER" && item.type !== "Other") return false;
      if (activeFilter === "CONVERTED" && item.status !== "Converted") return false;
      if (activeFilter === "FAILED" && item.status !== "Failed") return false;
      if (activeFilter === "UNSUPPORTED" && item.type !== "Unsupported") return false;

      // Search query
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        return (
          item.fileName.toLowerCase().includes(query) ||
          (item.archiveName && item.archiveName.toLowerCase().includes(query)) ||
          (item.folderName && item.folderName.toLowerCase().includes(query)) ||
          (item.pdfFileName && item.pdfFileName.toLowerCase().includes(query)) ||
          item.status.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [reportItems, selectedArchiveFilter, activeFilter, searchTerm]);

  // Export CSV
  const handleDownloadCsv = () => {
    const isBatch = Boolean(batchJobs && batchJobs.length > 0);
    const headers = isBatch
      ? ["Archive", "Parent Folder", "File Name", "Type", "Status", "PDF File", "Processed At"]
      : ["File Name", "Type", "Status", "PDF File", "Processed At"];

    const rows = reportItems.map((item) => {
      const baseRow = [
        `"${item.fileName.replace(/"/g, '""')}"`,
        `"${item.type}"`,
        `"${item.status}"`,
        `"${item.pdfFileName || "—"}"`,
        `"${item.processedAt || new Date().toISOString()}"`,
      ];
      if (isBatch) {
        return [
          `"${(item.archiveName || "").replace(/"/g, '""')}"`,
          `"${(item.folderName || "").replace(/"/g, '""')}"`,
          ...baseRow,
        ];
      }
      return baseRow;
    });

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `processing_report_${isBatch ? "batch" : (extractionSummary?.folder_name || "documents")}_${Date.now()}.csv`
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
      case "Retained":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
            <CheckCircle2 className="w-3 h-3 text-purple-600" /> Retained
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
      case "Other":
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-purple-700">
            <Folder className="w-3.5 h-3.5 text-purple-600" /> Other
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
            DocMorph Processing Report
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
              { id: "OTHER", label: "Other", count: reportItems.filter((i) => i.type === "Other").length },
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

        {/* Archive Selector (If batch has multiple archives) */}
        {distinctArchives.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#64748B] font-medium">Archive:</span>
            <select
              value={selectedArchiveFilter}
              onChange={(e) => setSelectedArchiveFilter(e.target.value)}
              className="px-3 py-1 rounded-xl bg-white border border-[#E2E8F0] focus:border-[#2563EB] text-xs font-medium text-[#0F172A] outline-none"
            >
              <option value="ALL">All Archives ({distinctArchives.length})</option>
              {distinctArchives.map((arch) => (
                <option key={arch} value={arch}>
                  {arch}
                </option>
              ))}
            </select>
          </div>
        )}

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
                {Boolean(batchJobs && batchJobs.length > 0) && (
                  <th className="py-3 px-4">Archive</th>
                )}
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
                    {Boolean(batchJobs && batchJobs.length > 0) && (
                      <td className="py-2.5 px-4 font-sans text-xs text-[#64748B]">
                        <span className="font-semibold text-[#0F172A] block">{item.archiveName || "—"}</span>
                        {item.folderName && (
                          <span className="text-[10px] text-blue-600 block">Output/{item.folderName}</span>
                        )}
                      </td>
                    )}
                    <td className="py-2.5 px-4 text-[#0F172A] font-medium">
                      {item.type === "PDF" ? (
                        <button
                          type="button"
                          onClick={() => handleOpenPdfPreview(item.jobId, item.fileName)}
                          className="truncate max-w-xs text-left text-blue-700 hover:text-blue-800 hover:underline flex items-center gap-1.5 group cursor-pointer"
                          title={`Click to preview: ${item.fileName}`}
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-500 group-hover:scale-110 transition-transform flex-shrink-0" />
                          <span className="truncate">{item.fileName}</span>
                        </button>
                      ) : (
                        <span className="truncate max-w-xs block" title={item.fileName}>
                          {item.fileName}
                        </span>
                      )}
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
                        <button
                          type="button"
                          onClick={() => handleOpenPdfPreview(item.jobId, item.pdfFileName)}
                          className="text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1.5 hover:underline group cursor-pointer text-left"
                          title={`Click to preview: ${item.pdfFileName}`}
                        >
                          <FileCheck2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          <span className="truncate max-w-xs">{item.pdfFileName}</span>
                          <Eye className="w-3 h-3 text-emerald-500 opacity-70 group-hover:opacity-100 flex-shrink-0 ml-1" />
                        </button>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={Boolean(batchJobs && batchJobs.length > 0) ? 5 : 4} className="py-8 text-center text-[#64748B] font-sans italic text-xs">
                    No matching files found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Feature 5: In-Browser Native PDF Viewer Modal */}
      <PdfViewerModal
        isOpen={previewState.isOpen}
        onClose={handleClosePdfPreview}
        filename={previewState.filename}
        base64Data={previewState.base64Data}
        sizeBytes={previewState.sizeBytes}
        isLoading={previewState.isLoading}
        errorMessage={previewState.errorMessage}
        onRetry={() => handleOpenPdfPreview(previewState.jobId || undefined, previewState.filename)}
      />
    </div>
  );
}
