import { ChatGroq } from "@langchain/groq";
import { z } from "zod";
import { tavilySearch } from "@/lib/tools/tavilySearch";
import { searchTicker } from "@/lib/tools/yahooFinance";
import type { ResearchState } from "@/lib/agent/state";
import { invokeWithRetry } from "@/lib/agent/retry";

const companySchema = z.object({
  name: z.string(),
  ticker: z.string().describe("Stock ticker symbol, e.g. AAPL"),
  sector: z.string(),
  industry: z.string(),
  description: z.string(),
  country: z.string(),
  founded: z.string().optional(),
  ceo: z.string().optional(),
  website: z.string().optional(),
});

const llm = new ChatGroq({
  model: "llama-3.3-70b-versatile",
  temperature: 0,
}).withStructuredOutput(companySchema);

export async function resolveCompany(
  state: ResearchState
): Promise<Partial<ResearchState>> {
  try {
    // Try yahoo-finance2 ticker search first
    const yTicker = await searchTicker(state.company);

    // Tavily search for company profile
    const search = await tavilySearch(
      `${state.company} company profile stock ticker sector industry CEO founded`,
      { maxResults: 5, includeAnswer: true }
    );

    const context = [
      yTicker ? `Yahoo Finance ticker found: ${yTicker}` : "",
      search.answer ?? "",
      ...search.results.map((r) => r.content),
    ]
      .filter(Boolean)
      .join("\n\n");

    const companyInfo = await invokeWithRetry(() =>
      llm.invoke([
        {
          role: "user",
          content: `Extract structured company information from the following research data for "${state.company}".
If the company has a stock ticker, include it. For private companies use "PRIVATE" as ticker.

Research data:
${context}`,
        },
      ])
    );

    const ticker = yTicker ?? (companyInfo.ticker !== "PRIVATE" ? companyInfo.ticker : undefined);

    return {
      ticker,
      companyInfo,
      completedSteps: ["resolveCompany"],
    };
  } catch (err) {
    return {
      errors: [`resolveCompany: ${String(err)}`],
      completedSteps: ["resolveCompany"],
    };
  }
}
