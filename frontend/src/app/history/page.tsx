"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { HistoryViewer } from "@/components/HistoryViewer";

export default function HistoryPage() {
  const router = useRouter();

  return <HistoryViewer onBack={() => router.push("/upload")} />;
}
