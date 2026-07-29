import { ChatGroq } from "@langchain/groq";
import { z } from "zod";
import { tavilySearch } from "@/lib/tools/tavilySearch";
import type { ResearchState } from "@/lib/agent/state";
import type { NewsData } from "@/lib/types";
import { invokeWithRetry } from "@/lib/agent/retry";
import { looseNumber, looseString } from "@/lib/agent/zodHelpers";

const newsSchema = z.object({
  summary: z.string(),
  sentiment: z.enum(["positive", "neutral", "negative"]),
  sentimentScore: looseNumber(-100, 100),
  articles: z.array(
    z.object({
      title: z.string(),
      source: z.string(),
      date: z.string().optional(),
      snippet: z.string(),
      url: z.string().optional(),
    })
  ),
  analystRatings: looseString().optional(),
});

function getLlm() {
  return new ChatGroq({
    model: "llama-3.3-70b-versatile",
    temperature: 0,
  }).withStructuredOutput(newsSchema);
}

export async function gatherNews(
  state: ResearchState
): Promise<Partial<ResearchState>> {
  try {
    const company = state.companyInfo?.name ?? state.company;

    const [latestNews, analystNews] = await Promise.all([
      tavilySearch(
        `${company} latest news earnings results product launch leadership 2025`,
        { maxResults: 6, searchDepth: "advanced", includeAnswer: true }
      ),
      tavilySearch(
        `${company} analyst rating price target buy sell hold Wall Street 2025`,
        { maxResults: 4, searchDepth: "advanced", includeAnswer: true }
      ),
    ]);

    const context = [
      latestNews.answer,
      ...latestNews.results.map((r) => `[${r.title}] (${r.url})\n${r.content}`),
      analystNews.answer,
      ...analystNews.results.map((r) => r.content),
    ]
      .filter(Boolean)
      .join("\n\n");

    // The zod schema's union+transform fields (sentimentScore, analystRatings)
    // are correctly coerced at runtime, but LangChain's structured-output
    // type inference exposes their pre-transform shape — cast to the real
    // runtime shape here. See zodHelpers.ts for why.
    const news = (await invokeWithRetry(() =>
      getLlm().invoke([
        {
          role: "user",
          content: `Analyze the following news about ${company} and extract structured information.

News data:
${context}

Provide:
1. A concise summary of recent developments and their investment implications
2. Overall sentiment: positive, neutral, or negative
3. Sentiment score: -100 (very bearish) to +100 (very bullish)
4. Top 5-6 most relevant articles with title, source, snippet, and URL
5. Summary of current analyst ratings/recommendations (if available)`,
        },
      ])
    )) as NewsData;

    return {
      news,
      completedSteps: ["gatherNews"],
    };
  } catch (err) {
    return {
      errors: [`gatherNews: ${String(err)}`],
      completedSteps: ["gatherNews"],
    };
  }
}
