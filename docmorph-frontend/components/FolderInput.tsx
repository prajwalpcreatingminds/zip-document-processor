"use client";

import React, { useState } from "react";
import { Folder, FolderPlus, ArrowLeft, ArrowRight, CornerDownRight, FileArchive } from "lucide-react";

interface FolderInputProps {
  folderName: string;
  originalZipName: string;
  onFolderNameChange: (name: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function FolderInput({
  folderName,
  originalZipName,
  onFolderNameChange,
  onBack,
  onNext,
}: FolderInputProps) {
  const [error, setError] = useState<string | null>(null);

  const cleanDisplay = folderName.trim() || "job description";

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) {
      setError("Please enter a valid folder name.");
      return;
    }
    setError(null);
    onNext();
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="glass-card rounded-2xl p-8">
        <div className="text-center mb-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EFF6FF] text-[#2563EB] border border-blue-200 mb-3">
            Step 2 of 5
          </span>
          <h2 className="text-2xl font-bold text-[#0F172A] tracking-tight">
            Destination Folder
          </h2>
          <p className="text-[#64748B] text-sm mt-1">
            What folder name should be created for storing the extracted documents and PDFs?
          </p>
        </div>

        <form onSubmit={handleNext}>
          <div className="mb-6">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#0F172A] mb-2">
              Folder Name:
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B]">
                <FolderPlus className="w-5 h-5 text-[#2563EB]" />
              </div>
              <input
                type="text"
                value={folderName}
                onChange={(e) => {
                  setError(null);
                  onFolderNameChange(e.target.value);
                }}
                placeholder="e.g. job description"
                autoFocus
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-white border border-[#E2E8F0] focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 text-[#0F172A] placeholder:text-slate-400 text-sm transition-all outline-none"
              />
            </div>
            {error && <p className="text-xs text-red-600 mt-2 font-medium">{error}</p>}
          </div>

          {/* Live Folder Hierarchy Preview */}
          <div className="mb-8 p-5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] block mb-3">
              Hierarchy Preview:
            </span>
            <div className="space-y-1.5 font-mono text-xs">
              <div className="flex items-center gap-2 text-[#2563EB] font-semibold">
                <Folder className="w-4 h-4 text-[#2563EB]" />
                <span>storage / {cleanDisplay} /</span>
              </div>
              <div className="pl-6 space-y-1 text-[#64748B]">
                <div className="flex items-center gap-2 text-amber-700">
                  <CornerDownRight className="w-3.5 h-3.5 text-slate-400" />
                  <FileArchive className="w-3.5 h-3.5 text-amber-600" />
                  <span>{originalZipName} (Original ZIP preserved)</span>
                </div>
                <div className="flex items-center gap-2 text-blue-700">
                  <CornerDownRight className="w-3.5 h-3.5 text-slate-400" />
                  <Folder className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span>Word / (All .doc and .docx files)</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-700">
                  <CornerDownRight className="w-3.5 h-3.5 text-slate-400" />
                  <Folder className="w-3.5 h-3.5 text-emerald-600" />
                  <span>PDF / (Existing &amp; Converted PDFs)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onBack}
              className="px-5 py-2.5 rounded-xl border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#64748B] hover:text-[#0F172A] font-medium text-sm transition-all flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-sm shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 hover:scale-[1.02]"
            >
              Next: Review &amp; Confirm <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
