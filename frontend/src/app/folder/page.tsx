"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Folder,
  FolderPlus,
  ArrowLeft,
  ArrowRight,
  CornerDownRight,
  FileArchive,
  Layers,
  Split,
} from "lucide-react";
import { useWorkflow } from "@/context/WorkflowContext";

export default function FolderPage() {
  const router = useRouter();
  const {
    files,
    folderMode,
    setFolderMode,
    folderName,
    setFolderName,
    folderMap,
    setFolderForFile,
  } = useWorkflow();

  const [error, setError] = useState<string | null>(null);

  const sampleSuggestions = ["requisition", "job description", "resume", "developer documents", "projects"];

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (folderMode === "SAME") {
      if (!folderName.trim()) {
        setError("Please enter a destination folder name.");
        return;
      }
    } else {
      // Check that every file has a non-empty folder name
      for (const f of files) {
        const assigned = (folderMap[f.name] || "").trim();
        if (!assigned) {
          setError(`Please specify a folder name for '${f.name}'.`);
          return;
        }
      }
    }
    setError(null);
    router.push("/confirmation");
  };

  const handleBack = () => {
    router.push("/upload");
  };

  const isSingle = files.length === 1;
  const cleanDisplay = folderName.trim() || "job description";

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="glass-card rounded-2xl p-8 sm:p-10">
        {/* Step Badge & Header */}
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EFF6FF] text-[#2563EB] border border-blue-200 mb-3">
            Step 2 of 7
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#0F172A] tracking-tight">
            {isSingle ? "Parent Folder Selection" : "Parent Folder Assignment"}
          </h2>
          <p className="text-[#64748B] text-sm mt-1.5 max-w-md mx-auto">
            {isSingle
              ? "Choose or enter a destination folder name for the extracted documents."
              : `Choose how destination folders should be assigned for your ${files.length} archives.`}
          </p>
        </div>

        {/* Mode Selector Tabs (Only shown when 2 or more archives are selected) */}
        {!isSingle && (
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setFolderMode("SAME");
              }}
              className={`p-4 rounded-xl border text-left transition-all flex flex-col gap-1.5 ${
                folderMode === "SAME"
                  ? "bg-[#EFF6FF] border-[#2563EB] shadow-xs"
                  : "bg-[#F8FAFC] border-[#E2E8F0] hover:border-slate-300"
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-xs">
                <Layers className={`w-4 h-4 ${folderMode === "SAME" ? "text-[#2563EB]" : "text-[#64748B]"}`} />
                <span className={folderMode === "SAME" ? "text-[#2563EB]" : "text-[#0F172A]"}>
                  Same Parent Folder
                </span>
              </div>
              <p className="text-[11px] text-[#64748B]">
                Apply one target folder name to all archives in this batch.
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setError(null);
                setFolderMode("DIFFERENT");
              }}
              className={`p-4 rounded-xl border text-left transition-all flex flex-col gap-1.5 ${
                folderMode === "DIFFERENT"
                  ? "bg-[#EFF6FF] border-[#2563EB] shadow-xs"
                  : "bg-[#F8FAFC] border-[#E2E8F0] hover:border-slate-300"
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-xs">
                <Split className={`w-4 h-4 ${folderMode === "DIFFERENT" ? "text-[#2563EB]" : "text-[#64748B]"}`} />
                <span className={folderMode === "DIFFERENT" ? "text-[#2563EB]" : "text-[#0F172A]"}>
                  Different Parent Folders
                </span>
              </div>
              <p className="text-[11px] text-[#64748B]">
                Assign an individual folder separately for each archive.
              </p>
            </button>
          </div>
        )}

        <form onSubmit={handleNext}>
          {/* Mode 1: Same Parent Folder Input / Single Archive Folder Input */}
          {isSingle || folderMode === "SAME" ? (
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#0F172A] mb-2">
                  {isSingle ? "Destination Folder Name:" : `Target Folder Name (Applied to all ${files.length} archives):`}
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
                      setFolderName(e.target.value);
                    }}
                    placeholder="e.g. requisition"
                    autoFocus
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-white border border-[#E2E8F0] focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 text-[#0F172A] placeholder:text-slate-400 text-sm transition-all outline-none"
                  />
                </div>
              </div>

              {/* Suggestions */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-[#64748B] font-medium">Suggestions:</span>
                {sampleSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => {
                      setError(null);
                      setFolderName(suggestion);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] hover:border-blue-300 text-[11px] text-[#64748B] hover:text-[#2563EB] hover:bg-[#EFF6FF] transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Mode 2: Different Parent Folders Per Archive */
            <div className="space-y-3 mb-6">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#0F172A]">
                Assign Folder Per Archive:
              </label>
              <div className="max-h-64 overflow-y-auto space-y-3 pr-1">
                {files.map((f, idx) => {
                  const currentVal = folderMap[f.name] || f.name.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " ");
                  return (
                    <div
                      key={`${f.name}-${idx}`}
                      className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2"
                    >
                      <div className="flex items-center gap-2 text-xs font-bold text-[#0F172A] truncate">
                        <FileArchive className="w-4 h-4 text-[#2563EB] flex-shrink-0" />
                        <span className="truncate">{idx + 1}. {f.name}</span>
                      </div>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#64748B]">
                          <Folder className="w-4 h-4 text-[#2563EB]" />
                        </div>
                        <input
                          type="text"
                          value={currentVal}
                          onChange={(e) => {
                            setError(null);
                            setFolderForFile(f.name, e.target.value);
                          }}
                          placeholder="Target folder name"
                          className="w-full pl-9 pr-3 py-2 rounded-lg bg-white border border-[#E2E8F0] focus:border-[#2563EB] text-xs text-[#0F172A] placeholder:text-slate-400 outline-none"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {error && <p className="text-xs text-red-600 mb-4 font-medium">{error}</p>}

          {/* Live Output Hierarchy Preview */}
          <div className="mb-8 p-5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] block mb-3">
              Output Hierarchy Preview {isSingle ? "" : `(${folderMode === "SAME" ? "Shared Parent" : "Individual Parents"})`}:
            </span>
            <div className="space-y-3 font-mono text-xs max-h-48 overflow-y-auto pr-1">
              {folderMode === "SAME" ? (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-[#2563EB] font-bold">
                    <Folder className="w-4 h-4 text-[#2563EB]" />
                    <span>Output / {cleanDisplay} /</span>
                  </div>
                  <div className="pl-6 space-y-1 text-[#64748B]">
                    {files.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 text-amber-700">
                        <CornerDownRight className="w-3.5 h-3.5 text-slate-400" />
                        <FileArchive className="w-3.5 h-3.5 text-amber-600" />
                        <span>{f.name}</span>
                      </div>
                    ))}
                    <div className="flex items-center gap-2 text-blue-700">
                      <CornerDownRight className="w-3.5 h-3.5 text-slate-400" />
                      <Folder className="w-3.5 h-3.5 text-[#2563EB]" />
                      <span>Word / (All .doc &amp; .docx files)</span>
                    </div>
                    <div className="flex items-center gap-2 text-emerald-700">
                      <CornerDownRight className="w-3.5 h-3.5 text-slate-400" />
                      <Folder className="w-3.5 h-3.5 text-emerald-600" />
                      <span>PDF / (Existing &amp; Generated PDFs)</span>
                    </div>
                    <div className="flex items-center gap-2 text-purple-700">
                      <CornerDownRight className="w-3.5 h-3.5 text-slate-400" />
                      <Folder className="w-3.5 h-3.5 text-purple-600" />
                      <span>Other / (Images, Spreadsheets, Media, Text/Data...)</span>
                    </div>
                  </div>
                </div>
              ) : (
                files.map((f, idx) => {
                  const targetF = (folderMap[f.name] || f.name.replace(/\.[^/.]+$/, "")).trim();
                  return (
                    <div key={idx} className="p-2.5 rounded-lg bg-white border border-[#E2E8F0] space-y-1">
                      <div className="flex items-center gap-2 text-[#2563EB] font-bold">
                        <Folder className="w-3.5 h-3.5 text-[#2563EB]" />
                        <span>Output / {targetF || "..."} /</span>
                      </div>
                      <div className="pl-5 text-[11px] text-[#64748B] flex items-center gap-2">
                        <CornerDownRight className="w-3 h-3 text-slate-400" />
                        <FileArchive className="w-3 h-3 text-amber-600" />
                        <span>{f.name} &rarr; Word/, PDF/, Other/</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Navigation Actions */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleBack}
              className="px-5 py-2.5 rounded-xl border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#64748B] hover:text-[#0F172A] font-medium text-sm transition-all flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Upload
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-sm shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 hover:scale-[1.02]"
            >
              Continue to Review <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
