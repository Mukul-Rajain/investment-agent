import { Annotation } from "@langchain/langgraph";
import type {
  CompanyInfo,
  FinancialData,
  SecFilingData,
  NewsData,
  InvestmentNetworkData,
  IndustrySignalsData,
  AnalysisResult,
} from "@/lib/types";

export const ResearchStateAnnotation = Annotation.Root({
  company: Annotation<string>(),
  ticker: Annotation<string | undefined>(),
  companyInfo: Annotation<CompanyInfo | undefined>(),
  financials: Annotation<FinancialData | undefined>(),
  secFilings: Annotation<SecFilingData | undefined>(),
  news: Annotation<NewsData | undefined>(),
  investmentNetwork: Annotation<InvestmentNetworkData | undefined>(),
  industrySignals: Annotation<IndustrySignalsData | undefined>(),
  analysis: Annotation<AnalysisResult | undefined>(),
  completedSteps: Annotation<string[]>({
    reducer: (a, b) => [...a, ...b],
    default: () => [],
  }),
  errors: Annotation<string[]>({
    reducer: (a, b) => [...a, ...b],
    default: () => [],
  }),
});

export type ResearchState = typeof ResearchStateAnnotation.State;
