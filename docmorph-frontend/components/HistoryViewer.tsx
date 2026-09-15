"use client";

import React, { useState, useEffect } from "react";
import { ConversionRecord } from "@/types";
import { getConversionHistory, viewPdf } from "@/lib/api";
import { PdfViewerModal } from "@/components/PdfViewerModal";
import {
  Database,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Folder,
  FileText,
  FileCheck2,
  ArrowLeft,
  Eye,
} from "lucide-react";

interface HistoryViewerProps {
  onBack: () => void;
}

export function HistoryViewer({ onBack }: HistoryViewerProps) {
  const [records, setRecords] = useState<ConversionRecord[]>([]);
  const [folderFilter, setFolderFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const handleOpenPdfPreview = async (rec: ConversionRecord) => {
    if (!rec.pdfFileName) return;

    if (!rec.jobId) {
      setPreviewState({
        isOpen: true,
        jobId: null,
        filename: rec.pdfFileName,
        base64Data: null,
        sizeBytes: null,
        isLoading: false,
        errorMessage: "Preview unavailable: No job identifier found for this legacy conversion record.",
      });
      return;
    }

    setPreviewState({
      isOpen: true,
      jobId: rec.jobId,
      filename: rec.pdfFileName,
      base64Data: null,
      sizeBytes: null,
      isLoading: true,
      errorMessage: null,
    });

    try {
      const res = await viewPdf(rec.jobId, rec.pdfFileName);
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

  const fetchHistory = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getConversionHistory(folderFilter || undefined, statusFilter || undefined);
      setRecords(res.records || []);
    } catch (err: any) {
      setError(err.message || "Failed to load conversion history from MongoDB.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchHistory();
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      <div className="glass-card rounded-2xl p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#EFF6FF] border border-blue-200 text-[#2563EB] flex items-center justify-center">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#0F172A] tracking-tight">
                DocMorph Conversion History
              </h2>
              <p className="text-xs text-[#64748B]">
                Persistent history log for all processed Word-to-PDF document conversions.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 rounded-xl border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#64748B] hover:text-[#0F172A] font-medium text-xs transition-all flex items-center gap-2 self-start sm:self-auto"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
        </div>

        {/* Filter Toolbar */}
        <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={folderFilter}
              onChange={(e) => setFolderFilter(e.target.value)}
              placeholder="Filter by folder name..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#E2E8F0] focus:border-[#2563EB] text-xs text-[#0F172A] placeholder:text-slate-400 outline-none"
            />
          </div>

          <div className="relative">
            <Filter className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#E2E8F0] focus:border-[#2563EB] text-xs text-[#0F172A] outline-none appearance-none cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="SUCCESS">SUCCESS only</option>
              <option value="FAILED">FAILED only</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-500/20"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Apply Filters
          </button>
        </form>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Table / List */}
        <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] bg-white">
          <table className="w-full text-left text-xs text-[#0F172A]">
            <thead className="bg-[#F8FAFC] text-[#64748B] uppercase font-semibold text-[10px] tracking-wider border-b border-[#E2E8F0]">
              <tr>
                <th className="px-4 py-3">Source Word Document</th>
                <th className="px-4 py-3">Generated PDF</th>
                <th className="px-4 py-3">Source Folder</th>
                <th className="px-4 py-3">Converted At</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] font-mono">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#64748B]">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#2563EB]" />
                    Loading metadata records from MongoDB...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#64748B] font-sans">
                    No conversion records found in MongoDB collection &apos;conversion&apos;.
                  </td>
                </tr>
              ) : (
                records.map((rec) => (
                  <tr key={rec._id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="px-4 py-3 font-semibold text-blue-700 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-[#2563EB]" />
                      {rec.wordFileName}
                    </td>
                    <td className="px-4 py-3 text-emerald-700">
                      {rec.pdfFileName && rec.conversionStatus === "SUCCESS" ? (
                        <button
                          type="button"
                          onClick={() => handleOpenPdfPreview(rec)}
                          className="text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1.5 hover:underline group cursor-pointer text-left"
                          title={rec.jobId ? `Click to preview: ${rec.pdfFileName}` : "Preview unavailable for legacy record"}
                        >
                          <FileCheck2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          <span className="truncate max-w-xs">{rec.pdfFileName}</span>
                          <Eye className="w-3 h-3 text-emerald-500 opacity-70 group-hover:opacity-100 flex-shrink-0 ml-1" />
                        </button>
                      ) : rec.pdfFileName ? (
                        <span className="flex items-center gap-1.5 text-slate-500">
                          <FileCheck2 className="w-3.5 h-3.5 text-slate-400" />
                          {rec.pdfFileName}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#0F172A]">
                      <span className="flex items-center gap-1 text-[11px]">
                        <Folder className="w-3.5 h-3.5 text-[#2563EB]" />
                        {rec.sourceFolder}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#64748B] text-[11px] whitespace-nowrap">
                      {formatDate(rec.convertedAt)}
                    </td>
                    <td className="px-4 py-3 text-[#64748B] text-[11px]">
                      {rec.durationSeconds != null ? `${rec.durationSeconds}s` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          rec.conversionStatus === "SUCCESS"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-red-50 text-red-700 border border-red-200"
                        }`}
                      >
                        {rec.conversionStatus === "SUCCESS" ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <AlertCircle className="w-3 h-3 text-red-600" />
                        )}
                        {rec.conversionStatus}
                      </span>
                    </td>
                  </tr>
                ))
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
        onRetry={() => {
          if (previewState.filename) {
            handleOpenPdfPreview({
              _id: "",
              jobId: previewState.jobId || "",
              pdfFileName: previewState.filename,
              wordFileName: "",
              sourceFolder: "",
              convertedAt: "",
              conversionStatus: "SUCCESS",
            });
          }
        }}
      />
    </div>
  );
}
