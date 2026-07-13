"use client";

import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, XCircle, Newspaper, Network, BarChart3, Target, Shield } from "lucide-react";
import type { AnalysisResult, ResearchState } from "@/lib/types";
import { ScoreBar } from "./ScoreBar";
import { OverprintText } from "./OverprintText";

interface Props {
  analysis: AnalysisResult;
  state: Partial<ResearchState>;
}

function Section({
  title,
  icon: Icon,
  shadow = "shadow-hard-ink",
  children,
}: {
  title: string;
  icon: React.ElementType;
  shadow?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`bg-paper border-2 border-ink p-6 ${shadow}`}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-6 h-6 border-2 border-ink flex items-center justify-center bg-riso-gold/20 shrink-0">
          <Icon className="w-3.5 h-3.5 text-ink" />
        </div>
        <h3 className="font-pixel text-[9px] sm:text-[10px] uppercase tracking-wider">
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

function BulletList({ items, variant = "neutral" }: { items: string[]; variant?: "positive" | "negative" | "neutral" }) {
  const colors = {
    positive: "text-riso-green",
    negative: "text-riso-red",
    neutral: "text-ink/70",
  };
  const chips = { positive: "bg-riso-green", negative: "bg-riso-red", neutral: "bg-riso-blue" };

  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5">
          <span className={`w-2 h-2 border border-ink mt-1.5 shrink-0 ${chips[variant]}`} />
          <span className={`text-sm ${colors[variant]} leading-relaxed`}>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function formatNumber(n: number | undefined, decimals = 2): string {
  if (n == null) return "N/A";
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return n.toFixed(decimals);
}

export function InvestmentReport({ analysis, state }: Props) {
  const isInvest = analysis.verdict === "INVEST";
  const f = state.financials;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="bg-paper border-2 border-ink p-6 shadow-hard-ink">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-black text-ink font-sans">
                <OverprintText offsetColorClass={isInvest ? "text-riso-green" : "text-riso-red"}>
                  {state.companyInfo?.name ?? state.company}
                </OverprintText>
              </h1>
              {state.ticker && (
                <span className="px-2 py-0.5 bg-ink text-paper text-xs font-bold border border-ink">
                  {state.ticker}
                </span>
              )}
            </div>
            <p className="text-sm text-ink/60">
              {state.companyInfo?.sector}
              {state.companyInfo?.industry && ` · ${state.companyInfo.industry}`}
              {state.companyInfo?.country && ` · ${state.companyInfo.country}`}
            </p>
            {f?.currentPrice != null && (
              <p className="text-xl font-bold text-ink mt-2">
                ${f.currentPrice.toFixed(2)}
                {f?.marketCap != null && (
                  <span className="text-sm font-normal text-ink/60 ml-2">
                    MCap {formatNumber(f.marketCap)}
                  </span>
                )}
              </p>
            )}
          </div>
          {/* Verdict stamp */}
          <div
            className={`flex flex-col items-center px-8 py-4 border-[3px] -rotate-2 ${
              isInvest
                ? "bg-riso-green/10 border-riso-green"
                : "bg-riso-red/10 border-riso-red"
            }`}
          >
            {isInvest ? (
              <CheckCircle2 className="w-7 h-7 text-riso-green mb-1" />
            ) : (
              <XCircle className="w-7 h-7 text-riso-red mb-1" />
            )}
            <span
              className={`font-pixel text-lg tracking-wide ${
                isInvest ? "text-riso-green" : "text-riso-red"
              }`}
            >
              {analysis.verdict}
            </span>
            <span className="text-xs text-ink/60 mt-1.5">
              {analysis.confidence}% confidence
            </span>
            {analysis.targetHorizon && (
              <span className="text-xs text-ink/50 mt-0.5">
                {analysis.targetHorizon}
              </span>
            )}
          </div>
        </div>

        <p className="mt-4 text-ink/80 text-sm leading-relaxed">
          {analysis.companyOverview}
        </p>
      </div>

      {/* Score Dashboard */}
      <Section title="Score Dashboard" icon={BarChart3} shadow="shadow-hard-blue">
        <div className="space-y-5">
          <ScoreBar
            label="Financial Health"
            score={analysis.financialHealth.score}
            description={analysis.financialHealth.summary}
          />
          <ScoreBar
            label="Growth Potential"
            score={analysis.growthPotential.score}
            description={analysis.growthPotential.summary}
          />
          <ScoreBar
            label="Risk Safety Score"
            score={analysis.riskProfile.score}
            description={analysis.riskProfile.summary}
          />
        </div>
      </Section>

      {/* Reasoning */}
      <Section title="Investment Reasoning" icon={Target} shadow="shadow-hard-blue">
        <ul className="space-y-2">
          {analysis.reasoning.map((r, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-ink/80 leading-relaxed">
              <span className="shrink-0 w-5 h-5 border-2 border-ink bg-riso-gold/20 text-ink text-xs flex items-center justify-center font-bold mt-0.5">
                {i + 1}
              </span>
              {r}
            </li>
          ))}
        </ul>
      </Section>

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Section title="Key Strengths" icon={TrendingUp} shadow="shadow-hard-green">
          <BulletList items={analysis.keyStrengths} variant="positive" />
        </Section>
        <Section title="Key Weaknesses" icon={TrendingDown} shadow="shadow-hard-red">
          <BulletList items={analysis.keyWeaknesses} variant="negative" />
        </Section>
      </div>

      {/* Financials Detail */}
      {f && Object.keys(f).length > 0 && (
        <Section title="Financial Metrics" icon={BarChart3} shadow="shadow-hard-gold">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: "P/E Ratio", value: f.peRatio?.toFixed(1) },
              { label: "P/B Ratio", value: f.pbRatio?.toFixed(2) },
              { label: "EPS", value: f.eps != null ? `$${f.eps.toFixed(2)}` : undefined },
              { label: "Revenue Growth", value: f.revenueGrowthYoY != null ? `${f.revenueGrowthYoY.toFixed(1)}%` : undefined },
              { label: "Gross Margin", value: f.grossMargin != null ? `${f.grossMargin.toFixed(1)}%` : undefined },
              { label: "Net Margin", value: f.netMargin != null ? `${f.netMargin.toFixed(1)}%` : undefined },
              { label: "Debt/Equity", value: f.debtToEquity?.toFixed(2) },
              { label: "Current Ratio", value: f.currentRatio?.toFixed(2) },
              { label: "Free Cash Flow", value: f.freeCashFlow != null ? formatNumber(f.freeCashFlow) : undefined },
              { label: "ROE", value: f.returnOnEquity != null ? `${f.returnOnEquity.toFixed(1)}%` : undefined },
              { label: "Analyst Target", value: f.analystTargetPrice != null ? `$${f.analystTargetPrice.toFixed(2)}` : undefined },
              { label: "Dividend Yield", value: f.dividendYield != null ? `${f.dividendYield.toFixed(2)}%` : undefined },
            ]
              .filter((m) => m.value != null)
              .map((m) => (
                <div key={m.label} className="border-2 border-ink bg-paper-dim p-3">
                  <p className="text-xs text-ink/50">{m.label}</p>
                  <p className="text-sm font-bold text-ink mt-0.5">{m.value}</p>
                </div>
              ))}
          </div>
          {analysis.financialHealth.keyMetrics.length > 0 && (
            <div className="mt-4 pt-4 border-t-2 border-ink/20">
              <BulletList items={analysis.financialHealth.keyMetrics} />
            </div>
          )}
        </Section>
      )}

      {/* Growth Catalysts */}
      {analysis.growthPotential.catalysts.length > 0 && (
        <Section title="Growth Catalysts" icon={TrendingUp} shadow="shadow-hard-green">
          <BulletList items={analysis.growthPotential.catalysts} variant="positive" />
        </Section>
      )}

      {/* Industry Outlook */}
      <Section title="Industry Outlook" icon={BarChart3} shadow="shadow-hard-blue">
        <p className="text-sm text-ink/80 leading-relaxed mb-4">
          {analysis.industryOutlook.summary}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-bold text-riso-green uppercase tracking-wider mb-2">Tailwinds</p>
            <BulletList items={analysis.industryOutlook.tailwinds} variant="positive" />
          </div>
          <div>
            <p className="text-xs font-bold text-riso-red uppercase tracking-wider mb-2">Headwinds</p>
            <BulletList items={analysis.industryOutlook.headwinds} variant="negative" />
          </div>
        </div>
      </Section>

      {/* Investment Network */}
      <Section title="Investment Network" icon={Network} shadow="shadow-hard-gold">
        <p className="text-sm text-ink/80 leading-relaxed mb-4">
          {analysis.investmentNetworkInsight.summary}
        </p>
        {analysis.investmentNetworkInsight.notableConnections.length > 0 && (
          <BulletList items={analysis.investmentNetworkInsight.notableConnections} />
        )}
      </Section>

      {/* News */}
      {state.news?.articles && state.news.articles.length > 0 && (
        <Section title="Recent News" icon={Newspaper}>
          <div className="flex items-center gap-2 mb-4">
            <span
              className={`px-2 py-0.5 border-2 text-xs font-bold uppercase ${
                state.news.sentiment === "positive"
                  ? "border-riso-green text-riso-green bg-riso-green/10"
                  : state.news.sentiment === "negative"
                  ? "border-riso-red text-riso-red bg-riso-red/10"
                  : "border-ink/40 text-ink/60"
              }`}
            >
              {state.news.sentiment} sentiment
            </span>
            <span className="text-xs text-ink/50">
              Score: {state.news.sentimentScore > 0 ? "+" : ""}{state.news.sentimentScore}
            </span>
          </div>
          <div className="space-y-3">
            {state.news.articles.slice(0, 5).map((a, i) => (
              <div key={i} className="border-2 border-ink/25 p-3">
                <p className="text-sm font-bold text-ink">{a.title}</p>
                <p className="text-xs text-ink/50 mt-0.5">{a.source}</p>
                <p className="text-xs text-ink/70 mt-1 leading-relaxed line-clamp-2">{a.snippet}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Risks */}
      {analysis.riskProfile.risks.length > 0 && (
        <Section title="Key Risks" icon={Shield} shadow="shadow-hard-red">
          <BulletList items={analysis.riskProfile.risks} variant="negative" />
        </Section>
      )}

      {/* Errors (dev aid) */}
      {state.errors && state.errors.length > 0 && (
        <div className="border-2 border-riso-gold bg-riso-gold/10 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-riso-gold" />
            <span className="text-xs font-bold text-ink uppercase">
              Some data sources had partial errors
            </span>
          </div>
          {state.errors.map((e, i) => (
            <p key={i} className="text-xs text-ink/60">
              {e}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
