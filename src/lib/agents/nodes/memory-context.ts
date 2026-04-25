import type { MemoryEntry } from "@/lib/types";
import type { GraphState, GraphStateUpdate } from "@/lib/agents/state";

/**
 * Injectable interface: test harness provides a deterministic loader;
 * production uses embedText + searchMemory.
 */
export type MemoryLoader = (args: {
  userId: number;
  transcript: string;
}) => Promise<MemoryEntry[]>;

export const defaultMemoryLoader: MemoryLoader = async ({
  userId,
  transcript,
}) => {
  const { embedText } = await import("@/lib/memory/embed");
  const { searchMemory } = await import("@/lib/memory/rag");
  try {
    const vec = await embedText(transcript.slice(0, 4000));
    return await searchMemory(userId, vec, 5);
  } catch (err) {
    // Memory is best-effort. If embed or search fails, the pipeline
    // should still run — downstream handlers tolerate an empty context.
    console.warn("memory_context: falling back to empty context", err);
    return [];
  }
};

export function makeMemoryContext(loader: MemoryLoader = defaultMemoryLoader) {
  return async function memoryContext(
    state: GraphState,
  ): Promise<GraphStateUpdate> {
    const entries = await loader({
      userId: state.user_id,
      transcript: state.transcript,
    });
    return { memory_context: entries };
  };
}
