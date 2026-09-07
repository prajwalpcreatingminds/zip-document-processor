"use client";

import React from "react";
import {
  Upload,
  FolderPlus,
  ShieldCheck,
  Archive,
  HelpCircle,
  ArrowRightLeft,
  CheckCircle2,
  Check,
} from "lucide-react";
import { useWorkflow } from "@/context/WorkflowContext";
import { usePathname } from "next/navigation";

interface StepItem {
  id: number;
  label: string;
  sub: string;
  icon: React.ElementType;
}

const STEPS: StepItem[] = [
  { id: 1, label: "Upload ZIP", sub: "Select archive", icon: Upload },
  { id: 2, label: "Target Folder", sub: "Name destination", icon: FolderPlus },
  { id: 3, label: "Confirmation", sub: "Verify parameters", icon: ShieldCheck },
  { id: 4, label: "Extraction", sub: "Organize files", icon: Archive },
  { id: 5, label: "Convert Decision", sub: "Prompt user", icon: HelpCircle },
  { id: 6, label: "Conversion", sub: "Process docs", icon: ArrowRightLeft },
  { id: 7, label: "Summary", sub: "Results & tree", icon: CheckCircle2 },
];

export function StepIndicator() {
  const { currentStep } = useWorkflow();
  const pathname = usePathname();

  // Hide stepper on MongoDB history page
  if (pathname === "/history") {
    return null;
  }

  return (
    <div className="w-full max-w-5xl mx-auto mb-10 px-2 sm:px-4">
      {/* Horizontal Step Stepper */}
      <div className="relative flex items-center justify-between">
        {/* Background Connecting Track Line */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 w-full bg-[#E2E8F0] rounded-full z-0" />

        {/* Dynamic Glowing Active Progress Line */}
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-[#2563EB] rounded-full z-0 transition-all duration-500 shadow-[0_0_8px_rgba(37,99,235,0.35)]"
          style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
        />

        {STEPS.map((step) => {
          const isCompleted = step.id < currentStep;
          const isCurrent = step.id === currentStep;
          const Icon = step.icon;

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center group">
              {/* Circular / Rounded Badge */}
              <div
                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                  isCompleted
                    ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20 scale-100 ring-2 ring-emerald-100"
                    : isCurrent
                    ? "bg-[#2563EB] text-white ring-4 ring-blue-100 scale-110 shadow-lg shadow-blue-500/30"
                    : "bg-white border border-[#E2E8F0] text-[#64748B] hover:border-slate-300"
                }`}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5 stroke-[2.5]" />
                ) : (
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </div>

              {/* Step Label & Subtext */}
              <div className="hidden sm:flex flex-col items-center mt-2.5 text-center">
                <span
                  className={`text-xs tracking-tight transition-colors ${
                    isCurrent
                      ? "text-[#2563EB] font-bold"
                      : isCompleted
                      ? "text-[#0F172A] font-semibold"
                      : "text-[#64748B] font-medium"
                  }`}
                >
                  {step.label}
                </span>
                <span className="text-[10px] text-[#64748B] hidden md:block mt-0.5">
                  {step.sub}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile-only Step counter */}
      <div className="flex sm:hidden justify-center items-center mt-4">
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#EFF6FF] text-[#2563EB] border border-blue-200">
          Step {currentStep} of 7: {STEPS[currentStep - 1]?.label}
        </span>
      </div>
    </div>
  );
}
