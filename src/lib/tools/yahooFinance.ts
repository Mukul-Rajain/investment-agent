import YahooFinance from "yahoo-finance2";
import type { FinancialData } from "@/lib/types";

// Instantiate the v4 class-based client
const yf = new YahooFinance();

type R = Record<string, unknown>;

function num(v: unknown): number | undefined {
  return typeof v === "number" ? v : undefined;
}
const pct = (v: unknown) => (typeof v === "number" ? v * 100 : undefined);

export async function getFinancialData(ticker: string): Promise<FinancialData> {
  let q: R = {};
  let s: R = {};
  let rev: Array<{ date: Date; annualTotalRevenue?: number }> = [];

  try {
    q = (await yf.quote(ticker)) as R;
  } catch { /* continue */ }

  try {
    s = (await yf.quoteSummary(ticker, {
      modules: ["financialData", "defaultKeyStatistics", "price", "summaryDetail"],
    })) as R;
  } catch { /* continue */ }

  try {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 5);
    rev = await yf.fundamentalsTimeSeries(ticker, {
      period1: oneYearAgo.toISOString().split("T")[0],
      type: "annual",
      module: "financials",
    }) as typeof rev;
  } catch { /* continue */ }

  const fd = (s.financialData ?? {}) as R;
  const ks = (s.defaultKeyStatistics ?? {}) as R;
  const price = (s.price ?? {}) as R;

  const revenueHistory = rev
    .filter((r) => r.annualTotalRevenue != null)
    .map((r) => ({
      year: r.date.getFullYear().toString(),
      value: r.annualTotalRevenue!,
    }));

  return {
    currentPrice: num(price.regularMarketPrice) ?? num(q.regularMarketPrice),
    marketCap: num(price.marketCap) ?? num(q.marketCap),
    peRatio: num(q.trailingPE) ?? num(price.regularMarketPrice),
    pbRatio: num(ks.priceToBook),
    eps: num(ks.trailingEps),
    revenueGrowthYoY: pct(fd.revenueGrowth),
    grossMargin: pct(fd.grossMargins),
    operatingMargin: pct(fd.operatingMargins),
    netMargin: pct(fd.profitMargins),
    debtToEquity: num(fd.debtToEquity),
    currentRatio: num(fd.currentRatio),
    freeCashFlow: num(fd.freeCashflow),
    returnOnEquity: pct(fd.returnOnEquity),
    dividendYield: num(q.dividendYield),
    fiftyTwoWeekHigh: num(q.fiftyTwoWeekHigh),
    fiftyTwoWeekLow: num(q.fiftyTwoWeekLow),
    analystTargetPrice: num(fd.targetMeanPrice),
    revenueHistory: revenueHistory.length > 0 ? revenueHistory : undefined,
  };
}

export async function searchTicker(companyName: string): Promise<string | null> {
  try {
    const results = (await yf.search(companyName, {
      quotesCount: 5,
      newsCount: 0,
    })) as R;

    const quotes = results.quotes as Array<R> | undefined;
    const stock = quotes?.find(
      (q) => q.quoteType === "EQUITY" || q.quoteType === "ETF"
    );
    return (stock?.symbol as string) ?? null;
  } catch {
    return null;
  }
}
