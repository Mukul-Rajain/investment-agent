import type { Metadata } from "next";

import { TickerFooter } from "@/components/TickerFooter";
import "./globals.css";

export const metadata: Metadata = {
  title: "InvestIQ — AI Investment Research Agent",
  description: "AI-powered investment research: enter any company name and get an INVEST or PASS verdict with full analysis.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="font-geist-sans antialiased"
    >
      <body className="min-h-screen flex flex-col bg-paper text-ink font-mono">
        <div className="texture-grain" />
        <div className="flex-1">{children}</div>
        <TickerFooter />
      </body>
    </html>
  );
}
