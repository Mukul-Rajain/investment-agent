import { ChatGroq } from "@langchain/groq";
import { z } from "zod";
import { getFinancialData } from "@/lib/tools/yahooFinance";
import { tavilySearch } from "@/lib/tools/tavilySearch";
import type { ResearchState } from "@/lib/agent/state";
import type { FinancialData } from "@/lib/types";
import { invokeWithRetry } from "@/lib/agent/retry";
import { looseNumber } from "@/lib/agent/zodHelpers";

const financialSchema = z.object({
  currentPrice: looseNumber().optional(),
  marketCap: looseNumber().optional(),
  peRatio: looseNumber().optional(),
  pbRatio: looseNumber().optional(),
  eps: looseNumber().optional(),
  revenueGrowthYoY: looseNumber().optional(),
  grossMargin: looseNumber().optional(),
  operatingMargin: looseNumber().optional(),
  netMargin: looseNumber().optional(),
  debtToEquity: looseNumber().optional(),
  currentRatio: looseNumber().optional(),
  freeCashFlow: looseNumber().optional(),
  returnOnEquity: looseNumber().optional(),
  dividendYield: looseNumber().optional(),
  fiftyTwoWeekHigh: looseNumber().optional(),
  fiftyTwoWeekLow: looseNumber().optional(),
  analystTargetPrice: looseNumber().optional(),
  revenueHistory: z
    .array(z.object({ year: z.string(), value: looseNumber() }))
    .optional(),
});

function getLlm() {
  return new ChatGroq({
    model: "llama-3.3-70b-versatile",
    temperature: 0,
  }).withStructuredOutput(financialSchema);
}

export async function gatherFinancials(
  state: ResearchState
): Promise<Partial<ResearchState>> {
  try {
    let financials = {};

    if (state.ticker) {
      financials = await getFinancialData(state.ticker);
    }

    // If limited data from Yahoo Finance, supplement with Tavily
    const hasData = Object.keys(financials).filter(
      (k) => (financials as Record<string, unknown>)[k] != null
    ).length;

    if (hasData < 5) {
      const search = await tavilySearch(
        `${state.company} financial data revenue earnings P/E ratio market cap annual report 2024 2025`,
        { maxResults: 5, searchDepth: "advanced", includeAnswer: true }
      );

      const context = [search.answer, ...search.results.map((r) => r.content)]
        .filter(Boolean)
        .join("\n\n");

      // Cast: the zod schema's looseNumber() fields are correctly coerced at
      // runtime, but LangChain's structured-output type inference exposes
      // their pre-transform shape. See zodHelpers.ts for why.
      const extracted = (await invokeWithRetry(() =>
        getLlm().invoke([
          {
            role: "user",
            content: `Extract financial metrics for ${state.company} from the following data. Only include numbers you are confident about. Convert percentages to numbers (e.g. 15% = 15).

Data:
${context}`,
          },
        ])
      )) as FinancialData;

      // Merge, preferring yahoo-finance2 data where available
      financials = { ...extracted, ...financials };
    }

    return {
      financials,
      completedSteps: ["gatherFinancials"],
    };
  } catch (err) {
    return {
      errors: [`gatherFinancials: ${String(err)}`],
      completedSteps: ["gatherFinancials"],
    };
  }
}
