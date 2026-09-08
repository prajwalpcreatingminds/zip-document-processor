"use client";

import React, { useState } from "react";
import { Clock, Play, Trash2, AlertCircle, FileArchive, CheckCircle, RefreshCw } from "lucide-react";
import { UnfinishedJobItem } from "@/types";

interface UnfinishedJobsBannerProps {
  jobs: UnfinishedJobItem[];
  onResume: (jobId: string) => Promise<any> | void;
  onDiscard: (jobId: string) => Promise<any> | void;
  isLoading?: boolean;
  onRefresh?: () => Promise<any> | void;
}

export function UnfinishedJobsBanner({
  jobs,
  onResume,
  onDiscard,
  isLoading = false,
  onRefresh,
}: UnfinishedJobsBannerProps) {
  const [resumingJobId, setResumingJobId] = useState<string | null>(null);
  const [discardingJobId, setDiscardingJobId] = useState<string | null>(null);

  if (jobs.length === 0) return null;

  const handleResume = async (jobId: string) => {
    setResumingJobId(jobId);
    try {
      await onResume(jobId);
    } finally {
      setResumingJobId(null);
    }
  };

  const handleDiscard = async (jobId: string) => {
    setDiscardingJobId(jobId);
    try {
      await onDiscard(jobId);
    } finally {
      setDiscardingJobId(null);
    }
  };

  const formatStageLabel = (stage: string, step: number) => {
    switch (stage) {
      case "UPLOADED":
        return `Step ${step}: Uploaded / Ready`;
      case "EXTRACTING":
        return `Step ${step}: Extraction in Progress`;
      case "EXTRACTED":
        return `Step ${step}: Extraction Complete (Convert Decision)`;
      case "CONVERTING":
        return `Step ${step}: Conversion in Progress`;
      case "COMPLETED":
        return `Step ${step}: Completed`;
      default:
        return `Step ${step}: ${stage}`;
    }
  };

  const formatTime = (timeStr?: string | null) => {
    if (!timeStr) return "Recently";
    try {
      const date = new Date(timeStr);
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) +
        " " +
        date.toLocaleDateString([], { month: "short", day: "numeric" });
    } catch {
      return timeStr;
    }
  };

  return (
    <div className="w-full mb-8 rounded-2xl bg-amber-50/70 border border-amber-200/90 p-5 shadow-xs transition-all animate-in fade-in">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-amber-200/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-amber-950 flex items-center gap-2">
              Unfinished Processing Jobs
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                {jobs.length} Available
              </span>
            </h3>
            <p className="text-[11px] text-amber-800">
              You have previously saved or interrupted tasks that can be resumed.
            </p>
          </div>
        </div>

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1.5 rounded-lg text-amber-700 hover:bg-amber-100/70 transition-colors"
            title="Refresh Unfinished Jobs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        )}
      </div>

      {/* Jobs list */}
      <div className="space-y-2.5">
        {jobs.map((job) => {
          const isBusy = resumingJobId === job.job_id || discardingJobId === job.job_id;
          return (
            <div
              key={job.job_id}
              className="p-3.5 rounded-xl bg-white border border-amber-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-amber-300 transition-all"
            >
              {/* Job Info */}
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 flex-shrink-0 mt-0.5">
                  <FileArchive className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-900 font-mono truncate" title={job.original_archive_name}>
                      {job.original_archive_name}
                    </span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-mono">
                      ID: {job.job_id.substring(0, 8)}...
                    </span>
                    {job.user_saved && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        Saved
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-slate-600 mt-1 flex-wrap">
                    <span className="font-semibold text-blue-700">
                      {formatStageLabel(job.stage, job.step)}
                    </span>
                    {job.total_files > 0 && (
                      <span>
                        Files: {job.total_files}
                      </span>
                    )}
                    {job.word_files_count > 0 && job.stage === "CONVERTING" && (
                      <span className="text-emerald-700 font-medium">
                        Progress: {job.converted_count} / {job.word_files_count} converted
                      </span>
                    )}
                    <span className="text-slate-400">
                      Last updated: {formatTime(job.updated_at)}
                    </span>
                  </div>

                  {job.error_message && (
                    <p className="text-[11px] text-red-600 mt-0.5 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      <span>{job.error_message}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => handleDiscard(job.job_id)}
                  disabled={isBusy}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-700 border border-slate-200 hover:border-red-200 text-xs font-semibold transition-all flex items-center gap-1 disabled:opacity-50"
                  title="Discard unfinished job"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{discardingJobId === job.job_id ? "Discarding..." : "Discard"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleResume(job.job_id)}
                  disabled={isBusy}
                  className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs shadow-blue-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50 hover:scale-[1.02]"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{resumingJobId === job.job_id ? "Resuming..." : "Resume"}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
