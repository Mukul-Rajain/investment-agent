import type { Metadata } from "next";
import { Geist, Geist_Mono, Press_Start_2P } from "next/font/google";
import { TickerFooter } from "@/components/TickerFooter";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const pixelFont = Press_Start_2P({
  variable: "--font-pixel-src",
  weight: "400",
  subsets: ["latin"],
});

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
      className={`${geistSans.variable} ${geistMono.variable} ${pixelFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-paper text-ink font-mono">
        <div className="texture-grain" />
        <div className="flex-1">{children}</div>
        <TickerFooter />
      </body>
    </html>
  );
}
