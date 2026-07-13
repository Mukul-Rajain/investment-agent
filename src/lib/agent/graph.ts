import { StateGraph, END, START } from "@langchain/langgraph";
import { ResearchStateAnnotation, type ResearchState } from "./state";
import { resolveCompany } from "./nodes/resolveCompany";
import { gatherFinancials } from "./nodes/gatherFinancials";
import { gatherSecFilings } from "./nodes/gatherSecFilings";
import { gatherNews } from "./nodes/gatherNews";
import { gatherInvestmentNetwork } from "./nodes/gatherInvestmentNetwork";
import { gatherIndustrySignals } from "./nodes/gatherIndustrySignals";
import { analyzeAndDecide } from "./nodes/analyzeAndDecide";

function buildGraph() {
  const graph = new StateGraph(ResearchStateAnnotation)
    .addNode("resolveCompany", resolveCompany)
    .addNode("gatherFinancials", gatherFinancials)
    .addNode("gatherSecFilings", gatherSecFilings)
    .addNode("gatherNews", gatherNews)
    .addNode("gatherInvestmentNetwork", gatherInvestmentNetwork)
    .addNode("gatherIndustrySignals", gatherIndustrySignals)
    .addNode("analyzeAndDecide", analyzeAndDecide)
    .addEdge(START, "resolveCompany")
    .addEdge("resolveCompany", "gatherFinancials")
    .addEdge("gatherFinancials", "gatherSecFilings")
    .addEdge("gatherSecFilings", "gatherNews")
    .addEdge("gatherNews", "gatherInvestmentNetwork")
    .addEdge("gatherInvestmentNetwork", "gatherIndustrySignals")
    .addEdge("gatherIndustrySignals", "analyzeAndDecide")
    .addEdge("analyzeAndDecide", END);

  return graph.compile();
}

export type SendFn = (data: object) => void;

export async function runResearchGraph(
  company: string,
  send: SendFn
): Promise<void> {
  const app = buildGraph();

  const initialState: Partial<ResearchState> = {
    company,
    completedSteps: [],
    errors: [],
  };

  const stream = await app.stream(initialState, { streamMode: "values" });

  let lastState: ResearchState | null = null;

  for await (const state of stream) {
    lastState = state as ResearchState;
    const lastStep =
      state.completedSteps?.[state.completedSteps.length - 1] ?? null;

    if (lastStep) {
      send({
        type: "step_complete",
        step: lastStep,
        state: {
          ticker: state.ticker,
          companyInfo: state.companyInfo,
          financials: state.financials,
          secFilings: state.secFilings,
          news: state.news,
          investmentNetwork: state.investmentNetwork,
          industrySignals: state.industrySignals,
          analysis: state.analysis,
          completedSteps: state.completedSteps,
          errors: state.errors,
        },
      });
    }
  }

  if (lastState?.analysis) {
    send({ type: "complete", report: lastState.analysis });
  } else {
    send({
      type: "error",
      message: lastState?.errors?.join("; ") ?? "Research failed with no output.",
    });
  }
}
