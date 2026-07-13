import { ChatGroq } from "@langchain/groq";
import { z } from "zod";
import { tavilySearch } from "@/lib/tools/tavilySearch";
import type { ResearchState } from "@/lib/agent/state";
import { invokeWithRetry } from "@/lib/agent/retry";

const industrySchema = z.object({
  summary: z.string(),
  tailwinds: z.array(z.string()),
  headwinds: z.array(z.string()),
  emergingTrends: z.array(z.string()),
  regulatoryFactors: z.array(z.string()),
  technologyDisruptors: z.array(z.string()),
  marketSizeGrowth: z.string().optional(),
});

const llm = new ChatGroq({
  model: "llama-3.3-70b-versatile",
  temperature: 0,
}).withStructuredOutput(industrySchema);

export async function gatherIndustrySignals(
  state: ResearchState
): Promise<Partial<ResearchState>> {
  try {
    const company = state.companyInfo?.name ?? state.company;
    const sector = state.companyInfo?.sector ?? "";
    const industry = state.companyInfo?.industry ?? "";

    const [industrySearch, futureSearch] = await Promise.all([
      tavilySearch(
        `${sector} ${industry} industry trends market size growth 2025 2026 outlook`,
        { maxResults: 5, searchDepth: "advanced", includeAnswer: true }
      ),
      tavilySearch(
        `${company} ${sector} technology disruption emerging trends AI regulation competitive landscape 2025`,
        { maxResults: 5, searchDepth: "advanced", includeAnswer: true }
      ),
    ]);

    const context = [
      industrySearch.answer,
      ...industrySearch.results.map((r) => r.content),
      futureSearch.answer,
      ...futureSearch.results.map((r) => r.content),
    ]
      .filter(Boolean)
      .join("\n\n");

    const industrySignals = await invokeWithRetry(() =>
      llm.invoke([
        {
          role: "user",
          content: `Analyze the industry environment and future signals for ${company} in the ${sector} / ${industry} space.

Research data:
${context}

Extract:
1. Executive summary of the industry landscape as it affects ${company}
2. Tailwinds: factors that will help ${company} grow (macro trends, industry growth, etc.)
3. Headwinds: risks from the industry or macro environment
4. Emerging trends that could reshape the industry in 2-5 years
5. Regulatory factors (current or upcoming regulations affecting this industry)
6. Technology disruptors that could threaten or benefit ${company}
7. Market size and growth rate estimate (if available)`,
        },
      ])
    );

    return {
      industrySignals,
      completedSteps: ["gatherIndustrySignals"],
    };
  } catch (err) {
    return {
      errors: [`gatherIndustrySignals: ${String(err)}`],
      completedSteps: ["gatherIndustrySignals"],
    };
  }
}
