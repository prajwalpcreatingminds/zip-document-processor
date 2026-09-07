"use client";

import React from "react";
import { WorkflowProvider } from "@/context/WorkflowContext";
import { Header } from "@/components/Header";
import { StepIndicator } from "@/components/StepIndicator";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <WorkflowProvider>
      <main className="min-h-screen flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-5xl mx-auto flex-1 flex flex-col">
          {/* Top Header */}
          <Header />

          {/* Page View Slot */}
          <div className="w-full flex-1 flex flex-col justify-center">
            {children}
          </div>
        </div>
      </main>
    </WorkflowProvider>
  );
}
