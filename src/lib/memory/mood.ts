import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { journalEntries } from "@/lib/db/schema";

/**
 * Returns the N most recent mood scores for a user, newest first. Used by
 * `check_escalation` to detect a declining trend.
 */
export async function getRecentMoodScores(
  userId: number,
  limit = 5,
): Promise<number[]> {
  const rows = await db
    .select({ moodScore: journalEntries.moodScore })
    .from(journalEntries)
    .where(eq(journalEntries.userId, userId))
    .orderBy(desc(journalEntries.createdAt))
    .limit(limit);
  return rows.map((r) => r.moodScore);
}

/**
 * A partial-write entry point used by the voice-mode `log_mood_score`
 * function call. Inserts a row marked as voice input with a placeholder
 * transcript; the full row with transcript + embedding is written later
 * by the async `/api/journal` run.
 */
export async function logMood(
  userId: number,
  moodScore: number,
  emotions: string[],
): Promise<{ id: string }> {
  if (moodScore < -1 || moodScore > 1 || Number.isNaN(moodScore)) {
    throw new Error("logMood: mood_score out of range");
  }
  const [row] = await db
    .insert(journalEntries)
    .values({
      userId,
      transcript: "[partial: mood-only]",
      aiResponse: null,
      intent: "reflection",
      severity: 0,
      moodScore,
      emotions,
      flagged: false,
      embedding: null,
      inputType: "voice",
    })
    .returning({ id: journalEntries.id });
  return { id: row.id };
}

/**
 * Returns true when the most recent entries form a strictly monotonic
 * decline of length >= 3. Operates on scores in newest-first order so it
 * must compare neighbours in reverse.
 */
export function isDecliningTrend(moodScoresNewestFirst: number[]): boolean {
  if (moodScoresNewestFirst.length < 3) return false;
  // Walk oldest → newest; if every step goes down, it's declining.
  const oldestFirst = [...moodScoresNewestFirst].reverse();
  for (let i = 1; i < oldestFirst.length; i++) {
    if (oldestFirst[i] >= oldestFirst[i - 1]) return false;
  }
  return true;
}
