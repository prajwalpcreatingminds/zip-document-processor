"use client";

import React from "react";
import { Layers } from "lucide-react";

export function Header() {
  return (
    <header className="w-full max-w-5xl mx-auto mb-8 flex items-center justify-between gap-4 border-b border-[#E2E8F0] pb-6 pt-2">
      {/* Brand & Logo */}
      <div className="flex items-center gap-3 select-none">
        <div className="w-11 h-11 rounded-2xl bg-[#2563EB] hover:bg-[#1D4ED8] transition-colors flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
          <Layers className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-black text-[#0F172A] tracking-tight flex items-center gap-2">
            ZIP Document Processor{" "}
            <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-[#EFF6FF] text-[#2563EB] border border-blue-200">
              Pipeline
            </span>
          </h1>
          <p className="text-xs text-[#64748B]">
            End-to-End Archive Extraction &amp; Word-to-PDF Conversion Engine
          </p>
        </div>
      </div>
    </header>
  );
}
