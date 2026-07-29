import { ChatGroq } from "@langchain/groq";
import { z } from "zod";
import { tavilySearch } from "@/lib/tools/tavilySearch";
import type { ResearchState } from "@/lib/agent/state";
import { invokeWithRetry } from "@/lib/agent/retry";

const secSchema = z.object({
  summary: z.string(),
  recentFilings: z.array(
    z.object({
      type: z.string(),
      date: z.string(),
      highlights: z.string(),
    })
  ),
  keyRisks: z.array(z.string()),
  opportunities: z.array(z.string()),
});

function getLlm() {
  return new ChatGroq({
    model: "llama-3.3-70b-versatile",
    temperature: 0,
  }).withStructuredOutput(secSchema);
}

export async function gatherSecFilings(
  state: ResearchState
): Promise<Partial<ResearchState>> {
  try {
    const company = state.companyInfo?.name ?? state.company;
    const ticker = state.ticker ?? "";

    const [filingSearch, riskSearch] = await Promise.all([
      tavilySearch(
        `${company} ${ticker} 10-K 10-Q SEC annual report 2024 2025 key findings management discussion`,
        { maxResults: 5, searchDepth: "advanced", includeAnswer: true }
      ),
      tavilySearch(
        `${company} SEC filing risk factors material weaknesses regulatory issues 2024 2025`,
        { maxResults: 4, searchDepth: "advanced", includeAnswer: true }
      ),
    ]);

    const context = [
      filingSearch.answer,
      ...filingSearch.results.map((r) => r.content),
      riskSearch.answer,
      ...riskSearch.results.map((r) => r.content),
    ]
      .filter(Boolean)
      .join("\n\n");

    const secFilings = await invokeWithRetry(() =>
      getLlm().invoke([
        {
          role: "user",
          content: `Analyze SEC filing data for ${company} and extract structured information.

Research data:
${context}

Provide:
1. A concise summary of the most recent filings
2. List of recent filings (type, approximate date, key highlight)
3. Top 5 key risks mentioned
4. Top 5 opportunities or strategic initiatives mentioned`,
        },
      ])
    );

    return {
      secFilings,
      completedSteps: ["gatherSecFilings"],
    };
  } catch (err) {
    return {
      errors: [`gatherSecFilings: ${String(err)}`],
      completedSteps: ["gatherSecFilings"],
    };
  }
}
