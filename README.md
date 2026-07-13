# InvestIQ — AI Investment Research Agent

An agent that takes a company name, researches it across financials, SEC filings, news, investor networks, and industry signals, and returns a structured **INVEST / PASS** verdict with scores, reasoning, and supporting evidence — streamed live to the browser as it works.

**Live demo:** [investiq-bud.vercel.app](https://investiq-bud.vercel.app)

---

## Overview

You type in a company name (public or private, ticker or full name). The agent then, in sequence:

1. Resolves the company to a ticker and profile
2. Pulls hard financial metrics (P/E, margins, debt, cash flow, revenue history)
3. Reads recent SEC filings (10-K / 10-Q) for risks and opportunities
4. Scans recent news and analyst sentiment
5. Maps the investment network (major shareholders, strategic partners, competitors)
6. Detects industry-level tailwinds/headwinds and emerging trends
7. Synthesizes everything into one investment decision — scored financial health, growth potential, and risk profile, a confidence level, and a final **INVEST** or **PASS**

Progress streams to the UI in real time (step-by-step), and while it's running you can drag around a small riso-styled physics toy instead of staring at a spinner.

---

## How to run it

### Prerequisites

- Node.js **20.9+**
- A free [Groq](https://console.groq.com/keys) API key (LLM inference — Groq's free tier gives a much larger daily budget than most alternatives, still bounded — see [Key decisions & trade-offs](#key-decisions--trade-offs))
- A free [Tavily](https://app.tavily.com) API key (web search — free tier: 1,000 searches/month)

### Setup

```bash
git clone <this-repo>
cd investment-agent
npm install
cp .env.local.example .env.local
```

Fill in `.env.local`:

```bash
GROQ_API_KEY=your_groq_api_key_here
TAVILY_API_KEY=your_tavily_api_key_here
```

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), type a company name, hit Analyze.

### Production build (local sanity check)

```bash
npm run build && npm start
```

### Deploying to Vercel

1. Push this repo to GitHub and import it into [Vercel](https://vercel.com/new).
2. In the Vercel project's **Settings → Environment Variables**, add `GROQ_API_KEY` and `TAVILY_API_KEY`. Nothing else is required — Vercel builds and deploys standard Next.js apps natively.
3. **Function duration matters here.** A full research run makes 7 sequential LLM calls plus several web searches and can take **2–5 minutes**. The API route declares `export const maxDuration = 300` (5 min, via Next.js route-segment config), but your **Vercel plan tier caps how much of that is actually honored** — Hobby plans allow much shorter function durations than this app needs in the worst case. For reliable end-to-end runs in production, a **Pro plan (or higher)** is recommended. On Hobby, expect slower/heavier research runs to be cut off mid-request.
4. Deploy. No other build configuration, `vercel.json`, or custom runtime settings are needed — the app already declares `runtime = "nodejs"` on the one route that needs it.

---

## How it works

**Stack:** Next.js 16 (App Router, Turbopack) + React 19 on the frontend; a single streaming API route on the backend; [LangGraph](https://langchain-ai.github.io/langgraphjs/) orchestrating the research pipeline; [Groq](https://groq.com)-hosted Llama 3.3 70B for all LLM steps via LangChain's `ChatGroq` + Zod structured output; [Tavily](https://tavily.com) for web search; [yahoo-finance2](https://github.com/gadicc/yahoo-finance2) for hard financial data.

### The pipeline

`src/lib/agent/graph.ts` builds a linear `StateGraph` — seven nodes, one edge each, no branching:

```
resolveCompany → gatherFinancials → gatherSecFilings → gatherNews
→ gatherInvestmentNetwork → gatherIndustrySignals → analyzeAndDecide
```

Each node (`src/lib/agent/nodes/*.ts`) follows the same shape:

1. Pull data from a tool — `yahoo-finance2` for financials, `tavily` search for everything qualitative
2. Feed that context to Groq's Llama 3.3 70B with a Zod schema via `.withStructuredOutput()`, so the model's response comes back as validated, typed JSON
3. Merge the result into shared graph state (`src/lib/agent/state.ts`), which accumulates across every node
4. On failure, catch the error, record it in `state.errors`, and let the graph continue — a failed news lookup shouldn't kill the whole run

The final node (`analyzeAndDecide`) sees the *entire* accumulated state — financials, filings, news, network, industry signals — and produces the scored verdict.

### Streaming to the UI

`src/app/api/research/route.ts` is a `POST` handler that opens a `TransformStream`, kicks off the graph, and forwards each state update to the client as a Server-Sent Event (`step_complete` events, then a final `complete` or `error` event). The frontend (`src/app/page.tsx`) reads this stream incrementally and drives the progress checklist (`ResearchProgress.tsx`) and the final report (`InvestmentReport.tsx`).

### Design system

The UI deliberately isn't another dark-mode AI-SaaS template. It's an "overprint / riso-print" identity: cream paper background, thick ink borders, hard offset drop-shadows (simulating riso color-layer misregistration), a halftone texture, and Press Start 2P reserved for short display text (logo, verdict stamp, section labels) paired with Geist Mono for everything else. Interactive extras — draggable riso-stamped stickers, a scrolling ticker-tape footer, and a `matter-js` physics sandbox on the waiting screen — exist purely to make the wait less dead.

---

## Key decisions & trade-offs

**LLM provider: Groq (Llama 3.3 70B), not Anthropic or Gemini.**
This project was built iterating live with an AI pair-programmer, and the provider changed twice during development:

- Started on Claude, then moved to Google Gemini in search of a fully free option.
- Gemini's free tier turned out to cap at **20 requests/day** on the project used here (not per-minute — per *day*, and the pipeline burns ~7 requests per run) — usable for a demo, not for real usage. Worse, several Gemini model IDs (`gemini-2.5-flash`, `gemini-2.5-flash-lite`) had already been closed to new users during development, requiring repeated model-ID swaps.
- Landed on **Groq**, whose free tier gives 100,000 tokens/day for Llama 3.3 70B — enough for roughly 10–15 full research runs/day, an order of magnitude better than Gemini's cap for this use case.

**Trade-off:** Llama's structured-output type discipline is looser than Gemini's or Claude's. It sometimes emits a numeric field as a string (`"20"` instead of `20`) or nests an object where a plain string was expected. Groq validates tool-call arguments **server-side** against the declared schema and hard-rejects the whole response on a mismatch — so this isn't a "fix it after receiving bad JSON" problem, it's a "the model's response never reaches you" problem. The fix (`src/lib/agent/zodHelpers.ts`) is a pair of permissive Zod schemas (`looseNumber`, `looseString`) that accept the shapes Llama actually produces and normalize them at parse time, applied to every numeric/loosely-typed field across the schemas.

**Sequential, not parallel, node execution.**
The five middle research steps (financials, filings, news, network, industry signals) don't depend on each other — only on `resolveCompany`. Running them in parallel would meaningfully cut wall-clock time. Chose sequential anyway: simpler state model, and — more importantly — Groq's free tier is rate-limited on tokens *per minute* as well as per day, so firing 5 LLM calls simultaneously would blow through the per-minute budget far faster than spacing them out. Documented as the top item to revisit in [What I'd improve](#what-id-improve-with-more-time).

**Retry with backoff, scoped to transient errors only.**
`src/lib/agent/retry.ts` retries 429/5xx errors with exponential backoff (~5s/10s/20s), but deliberately does **not** retry quota-exhaustion errors — no amount of waiting a few seconds fixes a daily quota that's already at zero. Errors are caught per-node and surfaced in the final report rather than crashing the run.

**SSE over polling or websockets.**
A plain `POST` that streams `text/event-stream` chunks needs no extra infrastructure (no queue, no websocket server) and lets the frontend show granular step-by-step progress. The cost: a single long-lived HTTP request is inherently fragile on serverless (see the Vercel function-duration caveat above), which is the main architectural thing I'd change with more time.

**What was left out:**
- No database — every research run is ephemeral; refresh the page and it's gone.
- No auth or rate-limiting on the API route itself — anyone with the URL can trigger a run (fine for a demo, not for production).
- No automated test suite — verification during development was done by driving the real app end-to-end (curl against the SSE endpoint, Playwright screenshots, and standalone reproductions for the trickier bugs) rather than unit tests.

---

## Example runs

Real output from the live agent. Financial figures are whatever Yahoo Finance / Tavily returned at the time of the run — they'll differ if you run it today.

### Palantir Technologies (PLTR)

*Current backend (Groq / Llama 3.3 70B).*

| | |
|---|---|
| Price | $126.79 · Market Cap $304.0B |
| P/E | 142.5 · Revenue Growth YoY 84.7% · Gross Margin 84.1% |
| **Verdict** | **INVEST** (80% confidence, long-term horizon) |
| Financial Health | 90/100 — "Excellent fundamentals with high revenue growth and strong margins" |
| Growth Potential | 85/100 — driven by AI/data-analytics expansion into new markets |
| Risk Profile | 70/100 — regulatory scrutiny and high valuation are the main risks |

> Strong investment network with top institutional shareholders (Vanguard, BlackRock, State Street, Peter Thiel, JPMorgan Chase). Key weaknesses: regulatory scrutiny, high valuation, competition from major cloud/data platforms.

### Apple (AAPL)

*Captured earlier in development, on the Gemini backend before the final Groq migration — pipeline and prompts are otherwise identical.*

| | |
|---|---|
| **Verdict** | **INVEST** (85% confidence, 3–5 year horizon) |
| Risk Profile | 82/100 — "resilient due to massive cash reserves and ecosystem lock-in," offset by China exposure, App Store regulatory scrutiny, and an executive leadership transition |

> Key strengths: unrivaled brand loyalty and ecosystem lock-in, ~27% net margins with ~$101B free cash flow, rapidly growing Services segment. Key weaknesses: stretched valuation (P/E ~38), declining Greater China sales (−4% QoQ), hardware supply-chain concentration risk.

### Microsoft (MSFT)

*Also captured on the Gemini backend during development.*

| | |
|---|---|
| **Verdict** | **INVEST** (90% confidence, 3–5 year horizon) |

> Reasoning: attractive valuation (P/E ~23) relative to ~18% revenue growth, dominant position in cloud + enterprise AI, strong cash generation, analyst targets meaningfully above the then-current price (~$560 vs ~$385). Key weaknesses: heavy AI-infrastructure capex requirements, ongoing antitrust/regulatory exposure, hardware supply-chain dependence.

---

## What I'd improve with more time

- **Parallelize the five independent research nodes.** They only depend on `resolveCompany`; running them concurrently (with a concurrency cap tuned to Groq's per-minute token limit) would cut a 2–5 minute run down significantly.
- **Move the research job off the request/response cycle.** A single HTTP request that can legitimately take 5 minutes is fragile on serverless — cold starts, dropped connections, and plan-tier duration caps all become real failure modes. A background job (queue + webhook, or a durable workflow) with the frontend polling or subscribing for updates would be materially more robust for production traffic.
- **Persist research history.** Right now a completed report lives only in browser state — add a database so past runs can be revisited, compared, or shared by URL.
- **A caching layer** for repeated lookups of the same company within a time window, to stretch the free-tier API budgets further.
- **Provider fallback.** If Groq is rate-limited, fail over to a secondary LLM provider instead of surfacing an error in that step of the report.
- **Real automated tests** — unit tests for the Zod coercion helpers (the exact bug class that broke the News step), and an integration test for the graph with mocked tool/LLM calls, rather than relying on live end-to-end verification during development.
- **Token-level streaming** from the LLM itself, so users see the analysis being written in real time instead of only step-level "done/not done" progress.

---

## Environment variables reference

| Variable | Required | Where to get it | Free tier |
|---|---|---|---|
| `GROQ_API_KEY` | Yes | [console.groq.com/keys](https://console.groq.com/keys) | 100,000 tokens/day (Llama 3.3 70B) |
| `TAVILY_API_KEY` | Yes | [app.tavily.com](https://app.tavily.com) | 1,000 searches/month |
