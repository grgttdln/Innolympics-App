import type { MemoryEntry } from "@/lib/types";

export const HARD_CONSTRAINTS = `NEVER: diagnose conditions, prescribe medication, recommend specific therapeutic protocols without qualification, minimize distress, argue with the user's feelings.
ALWAYS: defer to professionals for clinical matters.`;

/**
 * Render memory entries as a compact block for system/user prompts.
 * Keep each excerpt short so we don't bloat the context.
 */
export function renderMemoryBlock(entries: MemoryEntry[]): string {
  if (!entries.length) return "No past entries available.";
  return entries
    .slice(0, 5)
    .map((e, i) => {
      const excerpt =
        e.transcript.length > 300 ? `${e.transcript.slice(0, 300)}…` : e.transcript;
      const emotionsStr = e.emotions.length
        ? ` [emotions: ${e.emotions.join(", ")}]`
        : "";
      return `(${i + 1}) ${e.created_at} · mood ${e.mood_score.toFixed(
        2,
      )}${emotionsStr}\n${excerpt}`;
    })
    .join("\n\n");
}
