import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@/styles/globals.css";
import { AppShell } from "@/components/AppShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DocMorph — ZIP Document Processor & Word-to-PDF Conversion",
  description: "DocMorph: High-performance enterprise system for safe ZIP extraction, file organization, and real Word (.doc, .docx) to PDF document conversion.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased min-h-screen bg-[#FFFFFF] text-[#0F172A]">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
