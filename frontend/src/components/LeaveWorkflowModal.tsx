"use client";

import React from "react";
import { AlertTriangle, Bookmark, Trash2, X } from "lucide-react";

interface LeaveWorkflowModalProps {
  isOpen: boolean;
  onSaveAndExit: () => Promise<void> | void;
  onDontSave: () => Promise<void> | void;
  onCancel: () => void;
  isSaving?: boolean;
}

export function LeaveWorkflowModal({
  isOpen,
  onSaveAndExit,
  onDontSave,
  onCancel,
  isSaving = false,
}: LeaveWorkflowModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 flex-shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">Leave this job?</h3>
              <p className="text-xs text-slate-500">Unsaved workflow progress detection</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="px-6 py-2">
          <p className="text-sm text-slate-600 leading-relaxed">
            You have an unfinished processing job. Would you like to save it so you can resume later from the dashboard?
          </p>
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-all order-3 sm:order-1"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onDontSave}
            disabled={isSaving}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 order-2"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Don&apos;t Save
          </button>

          <button
            type="button"
            onClick={onSaveAndExit}
            disabled={isSaving}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-1.5 order-1 sm:order-3 hover:scale-[1.02]"
          >
            <Bookmark className="w-3.5 h-3.5" />
            {isSaving ? "Saving..." : "Save & Exit"}
          </button>
        </div>
      </div>
    </div>
  );
}
