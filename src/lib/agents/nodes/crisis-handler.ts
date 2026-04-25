import { CRISIS_HANDLER_PH } from "@/lib/safety/crisis-templates";
import type { GraphState, GraphStateUpdate } from "@/lib/agents/state";

/**
 * Durable writer for crisis escalation events. Injectable so unit tests
 * can assert the call without touching the DB.
 */
export type EscalationWriter = (args: {
  userId: number;
  severity: number;
  context: Record<string, unknown>;
}) => Promise<void>;

export const dbEscalationWriter: EscalationWriter = async ({
  userId,
  severity,
  context,
}) => {
  // Lazy-import so test runs (which inject their own writer) don't pay the
  // DATABASE_URL check at module load time.
  const { db } = await import("@/lib/db");
  const { escalationEvents } = await import("@/lib/db/schema");
  await db.insert(escalationEvents).values({
    userId,
    triggerType: "crisis_flag",
    severity,
    context,
  });
};

/**
 * Zero-LLM handler. Returns the static PH-localized crisis template and
 * writes an escalation row synchronously so the log is durable before the
 * response leaves the graph.
 */
export function makeCrisisHandler(
  writeEscalation: EscalationWriter = dbEscalationWriter,
) {
  return async function crisisHandler(
    state: GraphState,
  ): Promise<GraphStateUpdate> {
    await writeEscalation({
      userId: state.user_id,
      severity: state.severity,
      context: {
        intent: "crisis",
        crisis_keywords_detected: state.crisis_keywords_detected,
        transcript_excerpt: state.transcript.slice(0, 500),
      },
    });

    return {
      draft_response: CRISIS_HANDLER_PH,
      safety_passed: true,
      flagged: true,
    };
  };
}
