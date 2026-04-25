import type { GraphState, GraphStateUpdate } from "@/lib/agents/state";

/**
 * Writes the final journal entry row (with embedding) and returns the new
 * id via `entry_id`. Injectable for tests.
 */
export type MemoryPersister = (args: {
  state: GraphState;
}) => Promise<{ id: string }>;

export const dbMemoryPersister: MemoryPersister = async ({ state }) => {
  const { db } = await import("@/lib/db");
  const { journalEntries } = await import("@/lib/db/schema");
  const { embedText } = await import("@/lib/memory/embed");

  let embedding: number[] | null = null;
  try {
    embedding = await embedText(state.transcript.slice(0, 4000));
  } catch (err) {
    // Embedding is best-effort for the write path. We still persist the
    // entry without a vector so classification / escalation still work.
    console.warn("update_memory: embedding failed, inserting without vector", err);
  }

  const intent = state.intent ?? "reflection";
  const [row] = await db
    .insert(journalEntries)
    .values({
      userId: state.user_id,
      transcript: state.transcript,
      aiResponse: state.draft_response,
      intent,
      severity: state.severity,
      moodScore: state.mood_score,
      emotions: state.emotions,
      flagged: state.flagged,
      embedding,
      inputType: state.input_type,
    })
    .returning({ id: journalEntries.id });

  return { id: row.id };
};

export function makeUpdateMemory(
  persist: MemoryPersister = dbMemoryPersister,
) {
  return async function updateMemory(
    state: GraphState,
  ): Promise<GraphStateUpdate> {
    const { id } = await persist({ state });
    return { entry_id: id };
  };
}
