import { isDecliningTrend } from "@/lib/memory/trend";
import type { GraphState, GraphStateUpdate } from "@/lib/agents/state";

export type MoodFetcher = (userId: number, limit: number) => Promise<number[]>;
export type EscalationWriter = (args: {
  userId: number;
  severity: number;
  entryId: string | null;
  context: Record<string, unknown>;
}) => Promise<void>;

export const defaultMoodFetcher: MoodFetcher = async (userId, limit) => {
  const { getRecentMoodScores } = await import("@/lib/memory/mood");
  return getRecentMoodScores(userId, limit);
};

export const defaultEscalationWriter: EscalationWriter = async ({
  userId,
  severity,
  entryId,
  context,
}) => {
  const { db } = await import("@/lib/db");
  const { escalationEvents } = await import("@/lib/db/schema");
  await db.insert(escalationEvents).values({
    userId,
    triggerType: "mood_decline",
    severity,
    entryId,
    context,
  });
};

export function makeCheckEscalation(
  fetchMoods: MoodFetcher = defaultMoodFetcher,
  writeEscalation: EscalationWriter = defaultEscalationWriter,
) {
  return async function checkEscalation(
    state: GraphState,
  ): Promise<GraphStateUpdate> {
    // Crisis already triggered its own escalation event via the handler;
    // don't double-log. Mood-trend escalation is specifically about
    // non-crisis users slipping over multiple sessions.
    if (state.intent === "crisis") {
      return { needs_escalation: true };
    }

    const moods = await fetchMoods(state.user_id, 5);
    const declining = isDecliningTrend(moods);
    if (!declining) {
      return { needs_escalation: false };
    }

    await writeEscalation({
      userId: state.user_id,
      severity: state.severity,
      entryId: state.entry_id,
      context: {
        trigger: "mood_decline",
        last_5_moods: moods,
        triggering_entry_id: state.entry_id,
      },
    });

    return { needs_escalation: true };
  };
}
