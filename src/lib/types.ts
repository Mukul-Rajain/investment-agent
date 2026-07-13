export interface CompanyInfo {
  name: string;
  ticker: string;
  sector: string;
  industry: string;
  description: string;
  country: string;
  employees?: number;
  founded?: string;
  ceo?: string;
  website?: string;
}

export interface FinancialData {
  currentPrice?: number;
  marketCap?: number;
  peRatio?: number;
  pbRatio?: number;
  eps?: number;
  revenueGrowthYoY?: number;
  grossMargin?: number;
  operatingMargin?: number;
  netMargin?: number;
  debtToEquity?: number;
  currentRatio?: number;
  freeCashFlow?: number;
  returnOnEquity?: number;
  dividendYield?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  analystTargetPrice?: number;
  revenueHistory?: Array<{ year: string; value: number }>;
  earningsHistory?: Array<{ quarter: string; actual?: number; estimate?: number }>;
  raw?: Record<string, unknown>;
}

export interface SecFilingData {
  summary: string;
  recentFilings: Array<{
    type: string;
    date: string;
    highlights: string;
  }>;
  keyRisks: string[];
  opportunities: string[];
}

export interface NewsData {
  summary: string;
  sentiment: "positive" | "neutral" | "negative";
  sentimentScore: number;
  articles: Array<{
    title: string;
    source: string;
    date?: string;
    snippet: string;
    url?: string;
  }>;
  analystRatings?: string;
}

export interface InvestmentNetworkData {
  summary: string;
  majorInvestors: string[];
  strategicPartners: string[];
  subsidiaries: string[];
  competitors: string[];
  ecosystemInsights: string;
}

export interface IndustrySignalsData {
  summary: string;
  tailwinds: string[];
  headwinds: string[];
  emergingTrends: string[];
  regulatoryFactors: string[];
  technologyDisruptors: string[];
  marketSizeGrowth?: string;
}

export interface AnalysisResult {
  companyOverview: string;
  financialHealth: {
    score: number;
    summary: string;
    keyMetrics: string[];
  };
  growthPotential: {
    score: number;
    summary: string;
    catalysts: string[];
  };
  riskProfile: {
    score: number;
    summary: string;
    risks: string[];
  };
  investmentNetworkInsight: {
    summary: string;
    notableConnections: string[];
  };
  industryOutlook: {
    summary: string;
    tailwinds: string[];
    headwinds: string[];
  };
  verdict: "INVEST" | "PASS";
  confidence: number;
  targetHorizon: string;
  reasoning: string[];
  keyStrengths: string[];
  keyWeaknesses: string[];
}

export interface ResearchState {
  company: string;
  ticker?: string;
  companyInfo?: CompanyInfo;
  financials?: FinancialData;
  secFilings?: SecFilingData;
  news?: NewsData;
  investmentNetwork?: InvestmentNetworkData;
  industrySignals?: IndustrySignalsData;
  analysis?: AnalysisResult;
  completedSteps: string[];
  errors: string[];
}

export type StepId =
  | "resolveCompany"
  | "gatherFinancials"
  | "gatherSecFilings"
  | "gatherNews"
  | "gatherInvestmentNetwork"
  | "gatherIndustrySignals"
  | "analyzeAndDecide";

export interface StreamEvent {
  type: "step_complete" | "complete" | "error";
  step?: StepId;
  message?: string;
  state?: Partial<ResearchState>;
  report?: AnalysisResult;
}

export const RESEARCH_STEPS: Array<{ id: StepId; label: string; description: string }> = [
  { id: "resolveCompany", label: "Identifying Company", description: "Finding ticker and company profile" },
  { id: "gatherFinancials", label: "Analyzing Financials", description: "P/E, margins, debt, cash flow & revenue history" },
  { id: "gatherSecFilings", label: "Reading SEC Filings", description: "10-K / 10-Q annual and quarterly reports" },
  { id: "gatherNews", label: "Scanning News & Sentiment", description: "Recent headlines and analyst ratings" },
  { id: "gatherInvestmentNetwork", label: "Mapping Investment Network", description: "Investors, partners and ecosystem connections" },
  { id: "gatherIndustrySignals", label: "Detecting Industry Signals", description: "Trends, R&D breakthroughs and macro factors" },
  { id: "analyzeAndDecide", label: "AI Analysis & Decision", description: "Claude synthesizes all data into a verdict" },
];
