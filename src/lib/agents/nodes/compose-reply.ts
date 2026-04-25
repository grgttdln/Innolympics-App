import type { GraphState, GraphStateUpdate } from "@/lib/agents/state";

/**
 * No LLM. This node exists as an explicit edge target so the graph's
 * topology matches the spec and future formatting logic (rich markdown,
 * voice-friendly punctuation) has a home to land in.
 */
export async function composeReply(
  state: GraphState,
): Promise<GraphStateUpdate> {
  const cleaned = state.draft_response.trim();
  return { draft_response: cleaned };
}
