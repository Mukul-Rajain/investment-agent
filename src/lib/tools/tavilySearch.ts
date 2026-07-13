import { tavily } from "@tavily/core";

const getClient = () =>
  tavily({ apiKey: process.env.TAVILY_API_KEY! });

export interface SearchResult {
  title: string;
  url: string;
  content: string;
  score?: number;
}

export interface TavilyResponse {
  answer?: string;
  results: SearchResult[];
}

export async function tavilySearch(
  query: string,
  options: {
    maxResults?: number;
    searchDepth?: "basic" | "advanced";
    includeAnswer?: boolean;
  } = {}
): Promise<TavilyResponse> {
  try {
    const client = getClient();
    const response = await client.search(query, {
      maxResults: options.maxResults ?? 5,
      searchDepth: options.searchDepth ?? "advanced",
      includeAnswer: options.includeAnswer ?? true,
    });
    return {
      answer: response.answer,
      results: (response.results ?? []).map((r) => ({
        title: r.title,
        url: r.url,
        content: r.content,
        score: r.score,
      })),
    };
  } catch (err) {
    console.error("Tavily search error:", err);
    return { results: [] };
  }
}

export function formatSearchResults(response: TavilyResponse): string {
  const parts: string[] = [];
  if (response.answer) parts.push(`Summary: ${response.answer}`);
  for (const r of response.results) {
    parts.push(`[${r.title}]\n${r.content}`);
  }
  return parts.join("\n\n");
}
