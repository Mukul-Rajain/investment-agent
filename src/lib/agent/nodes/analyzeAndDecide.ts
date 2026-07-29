import { ChatGroq } from "@langchain/groq";
import { z } from "zod";
import type { ResearchState } from "@/lib/agent/state";
import type { AnalysisResult } from "@/lib/types";
import { invokeWithRetry } from "@/lib/agent/retry";
import { looseNumber } from "@/lib/agent/zodHelpers";

const analysisSchema = z.object({
  companyOverview: z.string(),
  financialHealth: z.object({
    score: looseNumber(0, 100),
    summary: z.string(),
    keyMetrics: z.array(z.string()),
  }),
  growthPotential: z.object({
    score: looseNumber(0, 100),
    summary: z.string(),
    catalysts: z.array(z.string()),
  }),
  riskProfile: z.object({
    score: looseNumber(0, 100).describe("Higher = lower risk / safer investment"),
    summary: z.string(),
    risks: z.array(z.string()),
  }),
  investmentNetworkInsight: z.object({
    summary: z.string(),
    notableConnections: z.array(z.string()),
  }),
  industryOutlook: z.object({
    summary: z.string(),
    tailwinds: z.array(z.string()),
    headwinds: z.array(z.string()),
  }),
  verdict: z.enum(["INVEST", "PASS"]),
  confidence: looseNumber(0, 100),
  targetHorizon: z.string(),
  reasoning: z.array(z.string()),
  keyStrengths: z.array(z.string()),
  keyWeaknesses: z.array(z.string()),
});

function getLlm() {
  return new ChatGroq({
    model: "llama-3.3-70b-versatile",
    temperature: 0.1,
  }).withStructuredOutput(analysisSchema);
}

function formatFinancials(f: ResearchState["financials"]): string {
  if (!f) return "No financial data available.";
  const fmt = (v: number | undefined, unit = "") =>
    v != null ? `${v.toFixed(2)}${unit}` : "N/A";
  const fmtB = (v: number | undefined) =>
    v != null ? `$${(v / 1e9).toFixed(2)}B` : "N/A";

  return `
- Current Price: ${fmt(f.currentPrice, " USD")}
- Market Cap: ${fmtB(f.marketCap)}
- P/E Ratio: ${fmt(f.peRatio)}
- P/B Ratio: ${fmt(f.pbRatio)}
- EPS: ${fmt(f.eps, " USD")}
- Revenue Growth YoY: ${fmt(f.revenueGrowthYoY, "%")}
- Gross Margin: ${fmt(f.grossMargin, "%")}
- Operating Margin: ${fmt(f.operatingMargin, "%")}
- Net Margin: ${fmt(f.netMargin, "%")}
- Debt/Equity: ${fmt(f.debtToEquity)}
- Current Ratio: ${fmt(f.currentRatio)}
- Free Cash Flow: ${fmtB(f.freeCashFlow)}
- Return on Equity: ${fmt(f.returnOnEquity, "%")}
- Dividend Yield: ${fmt(f.dividendYield, "%")}
- 52-Week High: ${fmt(f.fiftyTwoWeekHigh, " USD")}
- 52-Week Low: ${fmt(f.fiftyTwoWeekLow, " USD")}
- Analyst Target Price: ${fmt(f.analystTargetPrice, " USD")}
${
  f.revenueHistory?.length
    ? `- Revenue History: ${f.revenueHistory.map((r) => `${r.year}: $${(r.value / 1e9).toFixed(2)}B`).join(", ")}`
    : ""
}`.trim();
}

export async function analyzeAndDecide(
  state: ResearchState
): Promise<Partial<ResearchState>> {
  try {
    const company = state.companyInfo?.name ?? state.company;

    const prompt = `You are a senior investment analyst applying a balanced value + growth investing framework.

Analyze ALL available research data for ${company} (${state.ticker ?? "ticker unknown"}) and produce a comprehensive investment analysis with a final INVEST or PASS verdict.

═══════════════════════════════════════
COMPANY PROFILE
═══════════════════════════════════════
Name: ${company}
Ticker: ${state.ticker ?? "N/A"}
Sector: ${state.companyInfo?.sector ?? "N/A"}
Industry: ${state.companyInfo?.industry ?? "N/A"}
Country: ${state.companyInfo?.country ?? "N/A"}
Employees: ${state.companyInfo?.employees?.toLocaleString() ?? "N/A"}
Description: ${state.companyInfo?.description ?? "N/A"}
CEO: ${state.companyInfo?.ceo ?? "N/A"}

═══════════════════════════════════════
FINANCIAL DATA
═══════════════════════════════════════
${formatFinancials(state.financials)}

═══════════════════════════════════════
SEC FILINGS SUMMARY
═══════════════════════════════════════
${state.secFilings?.summary ?? "Not available"}

Key Risks from Filings:
${state.secFilings?.keyRisks?.map((r) => `• ${r}`).join("\n") ?? "N/A"}

Opportunities from Filings:
${state.secFilings?.opportunities?.map((o) => `• ${o}`).join("\n") ?? "N/A"}

═══════════════════════════════════════
NEWS & SENTIMENT
═══════════════════════════════════════
Overall Sentiment: ${state.news?.sentiment ?? "N/A"} (Score: ${state.news?.sentimentScore ?? "N/A"})
${state.news?.summary ?? "Not available"}
Analyst Ratings: ${state.news?.analystRatings ?? "N/A"}

═══════════════════════════════════════
INVESTMENT NETWORK
═══════════════════════════════════════
${state.investmentNetwork?.summary ?? "Not available"}

Major Investors: ${state.investmentNetwork?.majorInvestors?.join(", ") ?? "N/A"}
Strategic Partners: ${state.investmentNetwork?.strategicPartners?.join(", ") ?? "N/A"}
Ecosystem Insights: ${state.investmentNetwork?.ecosystemInsights ?? "N/A"}

═══════════════════════════════════════
INDUSTRY SIGNALS
═══════════════════════════════════════
${state.industrySignals?.summary ?? "Not available"}

Tailwinds: ${state.industrySignals?.tailwinds?.join(" | ") ?? "N/A"}
Headwinds: ${state.industrySignals?.headwinds?.join(" | ") ?? "N/A"}
Emerging Trends: ${state.industrySignals?.emergingTrends?.join(" | ") ?? "N/A"}
Technology Disruptors: ${state.industrySignals?.technologyDisruptors?.join(" | ") ?? "N/A"}
Market Size/Growth: ${state.industrySignals?.marketSizeGrowth ?? "N/A"}

═══════════════════════════════════════

Scoring guidelines:
- Financial Health (0-100): 80+ = excellent fundamentals; 60-79 = solid; 40-59 = mixed; below 40 = weak
- Growth Potential (0-100): based on revenue growth, TAM, catalysts, competitive moat
- Risk Profile (0-100): higher = SAFER; factor in debt, volatility, regulatory risk, execution risk

Be honest and rigorous. If data is limited, say so and reflect uncertainty in confidence score.
Provide INVEST or PASS based on a balanced view of value AND growth.`;

    // Cast: the zod schema's looseNumber() score fields are correctly
    // coerced at runtime, but LangChain's structured-output type inference
    // exposes their pre-transform shape. See zodHelpers.ts for why.
    const analysis = (await invokeWithRetry(() =>
      getLlm().invoke([{ role: "user", content: prompt }])
    )) as AnalysisResult;

    return {
      analysis,
      completedSteps: ["analyzeAndDecide"],
    };
  } catch (err) {
    return {
      errors: [`analyzeAndDecide: ${String(err)}`],
      completedSteps: ["analyzeAndDecide"],
    };
  }
}
