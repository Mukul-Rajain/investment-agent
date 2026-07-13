"use client";

import { useState, useRef } from "react";
import { Search, TrendingUp, BarChart3, ArrowRight, Rocket, Shield } from "lucide-react";
import { ResearchProgress } from "@/components/ResearchProgress";
import { InvestmentReport } from "@/components/InvestmentReport";
import { OverprintText } from "@/components/OverprintText";
import { StickerBadge } from "@/components/StickerBadge";
import type { AnalysisResult, ResearchState } from "@/lib/types";

type Phase =
  | { kind: "idle" }
  | { kind: "researching"; completedSteps: string[] }
  | { kind: "complete"; analysis: AnalysisResult; researchState: Partial<ResearchState> }
  | { kind: "error"; message: string };

const EXAMPLE_COMPANIES = [
  "Apple", "NVIDIA", "Tesla", "OpenAI", "Palantir", "Stripe", "SpaceX",
];

export default function Home() {
  const [query, setQuery] = useState("");
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const abortRef = useRef<AbortController | null>(null);
  const stateRef = useRef<Partial<ResearchState>>({});

  async function startResearch(company: string) {
    if (!company.trim()) return;

    abortRef.current?.abort();
    abortRef.current = new AbortController();
    stateRef.current = { company };

    setPhase({ kind: "researching", completedSteps: [] });

    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company }),
        signal: abortRef.current.signal,
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));

            if (event.type === "step_complete") {
              stateRef.current = { ...stateRef.current, ...event.state };
              setPhase({
                kind: "researching",
                completedSteps: event.state?.completedSteps ?? [],
              });
            } else if (event.type === "complete") {
              setPhase({
                kind: "complete",
                analysis: event.report,
                researchState: stateRef.current,
              });
            } else if (event.type === "error") {
              setPhase({ kind: "error", message: event.message });
            }
          } catch {
            // ignore malformed SSE lines
          }
        }
      }
    } catch (err: unknown) {
      if ((err as { name?: string }).name !== "AbortError") {
        setPhase({ kind: "error", message: String(err) });
      }
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startResearch(query);
  }

  function reset() {
    abortRef.current?.abort();
    setPhase({ kind: "idle" });
    setQuery("");
  }

  return (
    <div className="h-full bg-paper text-ink">
      {/* Nav */}
      <nav className="border-b-2 border-ink px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button onClick={reset} className="flex items-center gap-3 group">
            <div className="w-9 h-9 bg-ink border-2 border-ink flex items-center justify-center shadow-hard-red group-hover:shadow-hard-blue transition-shadow">
              <TrendingUp className="w-4 h-4 text-paper" />
            </div>
            <span className="font-pixel text-[10px] sm:text-xs">
              <OverprintText offsetColorClass="text-riso-red">INVESTIQ</OverprintText>
            </span>
          </button>
          {phase.kind !== "idle" && (
            <button
              onClick={reset}
              className="text-xs font-bold uppercase tracking-wider border-2 border-ink px-3 py-1.5 hover:bg-ink hover:text-paper transition-colors"
            >
              New Research
            </button>
          )}
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-12">
        {phase.kind === "idle" && (
          <div className="relative text-center mb-12">
            <StickerBadge
              icon={TrendingUp}
              label="Growth"
              ink="riso-green"
              rotate={-8}
              className="hidden md:block left-0 top-2"
            />
            <StickerBadge
              icon={Search}
              label="Research"
              ink="riso-blue"
              rotate={10}
              className="hidden md:block right-2 top-16"
            />
            <StickerBadge
              icon={Rocket}
              label="Invest"
              ink="riso-gold"
              rotate={-12}
              className="hidden md:block left-6 -bottom-16"
            />
            <StickerBadge
              icon={Shield}
              label="Risk"
              ink="riso-red"
              rotate={9}
              className="hidden md:block right-8 -bottom-24"
            />

            <div className="inline-flex items-center gap-2 px-3 py-1.5 border-2 border-ink bg-riso-gold/20 font-pixel text-[8px] sm:text-[9px] uppercase tracking-wider mb-8">
              <BarChart3 className="w-3 h-3" />
              AI Research Agent
            </div>
            <h1 className="font-sans text-4xl sm:text-5xl font-black mb-4 leading-tight">
              <OverprintText offsetColorClass="text-riso-blue">Should you invest in</OverprintText>
              <br />
              <OverprintText offsetColorClass="text-riso-green">this company?</OverprintText>
            </h1>
            <p className="text-ink/70 text-lg max-w-xl mx-auto">
              Enter any company name. The agent researches financials, SEC filings, news,
              investment network, and industry signals — then gives you a verdict.
            </p>
          </div>
        )}

        {(phase.kind === "idle" || phase.kind === "error") && (
          <div className="max-w-xl mx-auto">
            <form onSubmit={handleSubmit} className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink/50" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter company name (e.g. Apple, Tesla, Stripe...)"
                className="w-full bg-paper border-2 border-ink pl-12 pr-36 py-4 text-ink placeholder-ink/40 focus:outline-none focus:shadow-hard-blue transition-shadow"
                autoFocus
              />
              <button
                type="submit"
                disabled={!query.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 bg-ink hover:bg-riso-blue disabled:opacity-30 disabled:cursor-not-allowed text-paper text-sm font-bold uppercase px-4 py-2.5 border-2 border-ink transition-colors"
              >
                Analyze
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            {phase.kind === "idle" && (
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                {EXAMPLE_COMPANIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      setQuery(c);
                      startResearch(c);
                    }}
                    className="text-xs font-bold px-3 py-1.5 border-2 border-ink bg-paper hover:bg-riso-gold hover:shadow-hard-ink transition-all"
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}

            {phase.kind === "error" && (
              <div className="mt-4 p-4 border-2 border-riso-red bg-riso-red/10 shadow-hard-red">
                <p className="text-riso-red text-sm font-bold">{phase.message}</p>
              </div>
            )}
          </div>
        )}

        {phase.kind === "researching" && (
          <div className="py-8">
            <ResearchProgress completedSteps={phase.completedSteps} />
          </div>
        )}

        {phase.kind === "complete" && (
          <div className="pt-2">
            <InvestmentReport analysis={phase.analysis} state={phase.researchState} />
          </div>
        )}
      </main>
    </div>
  );
}
