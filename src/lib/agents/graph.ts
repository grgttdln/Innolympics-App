import { END, START, StateGraph } from "@langchain/langgraph";

import { GraphStateAnnotation, type GraphState } from "./state";
import { makeClassifyInput } from "./nodes/classify-input";
import { makeCrisisHandler } from "./nodes/crisis-handler";
import { makeMemoryContext } from "./nodes/memory-context";
import { makeDistressHandler } from "./nodes/distress-handler";
import { makeReflectionAgent } from "./nodes/reflection-agent";
import { makeGrowthTracker } from "./nodes/growth-tracker";
import { makeSafetyGate } from "./nodes/safety-gate";
import { composeReply } from "./nodes/compose-reply";
import { makeUpdateMemory } from "./nodes/update-memory";
import { makeCheckEscalation } from "./nodes/check-escalation";
import type { JournalState } from "@/lib/types";

/**
 * Public state matching the spec's JournalState — we expose this as the
 * invoke input shape so callers don't need to know about Annotation.
 */
export type JournalInvokeInput = Pick<
  JournalState,
  "transcript" | "input_type" | "user_id"
>;

function buildGraph() {
  const classifyInput = makeClassifyInput();
  const crisisHandler = makeCrisisHandler();
  const memoryContext = makeMemoryContext();
  const distressHandler = makeDistressHandler();
  const reflectionAgent = makeReflectionAgent();
  const growthTracker = makeGrowthTracker();
  const safetyGate = makeSafetyGate();
  const updateMemory = makeUpdateMemory();
  const checkEscalation = makeCheckEscalation();

  const graph = new StateGraph(GraphStateAnnotation)
    .addNode("classify_input", classifyInput)
    .addNode("crisis_handler", crisisHandler)
    .addNode("load_memory", memoryContext)
    .addNode("distress_handler", distressHandler)
    .addNode("reflection_agent", reflectionAgent)
    .addNode("growth_tracker", growthTracker)
    .addNode("safety_gate", safetyGate)
    .addNode("compose_reply", composeReply)
    .addNode("update_memory", updateMemory)
    .addNode("check_escalation", checkEscalation)

    .addEdge(START, "classify_input")

    // First fork: crisis skips RAG + safety gate entirely
    .addConditionalEdges(
      "classify_input",
      (s: GraphState) =>
        s.intent === "crisis" ? "crisis_handler" : "load_memory",
      ["crisis_handler", "load_memory"],
    )

    // Second fork: route to persona handler by intent
    .addConditionalEdges(
      "load_memory",
      (s: GraphState) => {
        switch (s.intent) {
          case "distress":
            return "distress_handler";
          case "growth":
            return "growth_tracker";
          case "reflection":
          default:
            return "reflection_agent";
        }
      },
      ["distress_handler", "reflection_agent", "growth_tracker"],
    )

    .addEdge("distress_handler", "safety_gate")
    .addEdge("reflection_agent", "safety_gate")
    .addEdge("growth_tracker", "safety_gate")

    // Third fork: safety either approves or kicks back to the same handler
    .addConditionalEdges(
      "safety_gate",
      (s: GraphState) => {
        if (s.safety_passed) return "compose_reply";
        switch (s.intent) {
          case "distress":
            return "distress_handler";
          case "growth":
            return "growth_tracker";
          default:
            return "reflection_agent";
        }
      },
      [
        "compose_reply",
        "distress_handler",
        "reflection_agent",
        "growth_tracker",
      ],
    )

    .addEdge("crisis_handler", "compose_reply")
    .addEdge("compose_reply", "update_memory")
    .addEdge("update_memory", "check_escalation")
    .addEdge("check_escalation", END);

  return graph.compile();
}

let cached: ReturnType<typeof buildGraph> | null = null;

export function getJournalGraph(): ReturnType<typeof buildGraph> {
  if (!cached) cached = buildGraph();
  return cached;
}

export async function runJournalGraph(
  input: JournalInvokeInput,
): Promise<GraphState> {
  const graph = getJournalGraph();
  return (await graph.invoke(input)) as GraphState;
}
