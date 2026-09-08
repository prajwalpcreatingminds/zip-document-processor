"use client";

import React, { useEffect } from "react";
import { X, FileText, AlertCircle, RefreshCw, ExternalLink, Download } from "lucide-react";

interface PdfViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  filename: string | null;
  base64Data: string | null;
  sizeBytes?: number | null;
  isLoading: boolean;
  errorMessage?: string | null;
  onRetry?: () => void;
}

export function PdfViewerModal({
  isOpen,
  onClose,
  filename,
  base64Data,
  sizeBytes,
  isLoading,
  errorMessage,
  onRetry,
}: PdfViewerModalProps) {
  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const dataUri = base64Data ? `data:application/pdf;base64,${base64Data}` : null;

  const formatFileSize = (bytes?: number | null): string => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleDownload = () => {
    if (!dataUri || !filename) return;
    const link = document.createElement("a");
    link.href = dataUri;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenInNewTab = () => {
    if (!dataUri) return;
    const byteCharacters = atob(base64Data!);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: "application/pdf" });
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-5xl h-[90vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden transform transition-all animate-in zoom-in-95 duration-200">
        {/* Header Bar */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-4 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 flex-shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 truncate font-mono" title={filename || "PDF Viewer"}>
                  {filename || "PDF Preview"}
                </h3>
                {sizeBytes != null && sizeBytes > 0 && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
                    {formatFileSize(sizeBytes)}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">In-Browser Native PDF Viewer</p>
            </div>
          </div>

          {/* Header Controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {dataUri && (
              <>
                <button
                  type="button"
                  onClick={handleOpenInNewTab}
                  className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-2xs"
                  title="Open in new browser tab"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">New Tab</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownload}
                  className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-2xs"
                  title="Download PDF file"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Download</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-700 border border-slate-200 transition-colors"
              title="Close viewer (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Viewer Body */}
        <div className="flex-1 bg-slate-100 relative overflow-hidden flex items-center justify-center p-2 sm:p-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 p-8 text-slate-500">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
              <p className="text-sm font-semibold text-slate-700">Loading document preview...</p>
              <p className="text-xs text-slate-400">Retrieving Base64 PDF stream from server</p>
            </div>
          ) : errorMessage ? (
            <div className="max-w-md w-full p-6 rounded-2xl bg-white border border-red-200 shadow-md text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">Unable to Preview PDF</h4>
                <p className="text-xs text-red-600 mt-1.5 leading-relaxed">{errorMessage}</p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                {onRetry && (
                  <button
                    type="button"
                    onClick={onRetry}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-all shadow-xs"
                  >
                    Try Again
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          ) : dataUri ? (
            <iframe
              src={`${dataUri}#toolbar=1&navpanes=0`}
              className="w-full h-full rounded-xl border border-slate-300/80 bg-white shadow-inner"
              title={filename || "PDF Document"}
            />
          ) : (
            <div className="text-xs text-slate-500">No PDF content available.</div>
          )}
        </div>
      </div>
    </div>
  );
}
