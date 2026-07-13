import { ChatGroq } from "@langchain/groq";
import { z } from "zod";
import { tavilySearch } from "@/lib/tools/tavilySearch";
import type { ResearchState } from "@/lib/agent/state";
import { invokeWithRetry } from "@/lib/agent/retry";

const networkSchema = z.object({
  summary: z.string(),
  majorInvestors: z.array(z.string()),
  strategicPartners: z.array(z.string()),
  subsidiaries: z.array(z.string()),
  competitors: z.array(z.string()),
  ecosystemInsights: z.string(),
});

const llm = new ChatGroq({
  model: "llama-3.3-70b-versatile",
  temperature: 0,
}).withStructuredOutput(networkSchema);

export async function gatherInvestmentNetwork(
  state: ResearchState
): Promise<Partial<ResearchState>> {
  try {
    const company = state.companyInfo?.name ?? state.company;

    const [investorSearch, partnerSearch] = await Promise.all([
      tavilySearch(
        `${company} major investors shareholders institutional ownership venture capital funding 2024 2025`,
        { maxResults: 5, searchDepth: "advanced", includeAnswer: true }
      ),
      tavilySearch(
        `${company} strategic partnerships joint ventures acquisitions subsidiaries competitors 2024 2025`,
        { maxResults: 5, searchDepth: "advanced", includeAnswer: true }
      ),
    ]);

    const context = [
      investorSearch.answer,
      ...investorSearch.results.map((r) => r.content),
      partnerSearch.answer,
      ...partnerSearch.results.map((r) => r.content),
    ]
      .filter(Boolean)
      .join("\n\n");

    const investmentNetwork = await invokeWithRetry(() =>
      llm.invoke([
        {
          role: "user",
          content: `Analyze the investment network and business ecosystem of ${company}.

Research data:
${context}

Extract:
1. Summary of the investment network and what it signals for the company
2. Major institutional investors or notable shareholders (top 5)
3. Key strategic partners (companies that strengthen ${company}'s competitive position)
4. Known subsidiaries or companies acquired
5. Main competitors
6. Ecosystem insights: How do these connections affect ${company}'s growth potential or stability?`,
        },
      ])
    );

    return {
      investmentNetwork,
      completedSteps: ["gatherInvestmentNetwork"],
    };
  } catch (err) {
    return {
      errors: [`gatherInvestmentNetwork: ${String(err)}`],
      completedSteps: ["gatherInvestmentNetwork"],
    };
  }
}
