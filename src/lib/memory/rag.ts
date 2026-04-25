import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import type { MemoryEntry } from "@/lib/types";

/**
 * pgvector-backed nearest-neighbour search over a user's past entries.
 *
 * Uses the ivfflat cosine-distance index when there's enough data; falls
 * back to sequential scan for small tables (both are correct, just
 * different latencies).
 *
 * `queryEmbedding` must be a 768-dim `number[]` from `embedText()`.
 */
export async function searchMemory(
  userId: number,
  queryEmbedding: number[],
  limit = 5,
): Promise<MemoryEntry[]> {
  if (queryEmbedding.length !== 768) {
    throw new Error(
      `searchMemory: expected 768-dim vector, got ${queryEmbedding.length}`,
    );
  }

  const literal = `[${queryEmbedding.join(",")}]`;

  const result = (await db.execute(sql`
    SELECT transcript, ai_response, mood_score, emotions, created_at
    FROM journal_entries
    WHERE user_id = ${userId} AND embedding IS NOT NULL
    ORDER BY embedding <=> ${literal}::vector
    LIMIT ${limit}
  `)) as unknown;

  // drizzle-orm/neon-http returns a full `QueryResult` shape
  // (`{ fields, rows, rowCount, ... }`). Older / other drivers return a
  // bare array. Accept both rather than guessing.
  const rows = extractRows<{
    transcript: string;
    ai_response: string | null;
    mood_score: number;
    emotions: string[] | null;
    created_at: Date | string;
  }>(result);

  return rows.map((r) => ({
    transcript: r.transcript,
    ai_response: r.ai_response,
    mood_score: r.mood_score,
    emotions: r.emotions ?? [],
    created_at:
      r.created_at instanceof Date
        ? r.created_at.toISOString()
        : String(r.created_at),
  }));
}

function extractRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (
    result &&
    typeof result === "object" &&
    Array.isArray((result as { rows?: unknown[] }).rows)
  ) {
    return (result as { rows: T[] }).rows;
  }
  throw new Error(
    `searchMemory: unexpected db.execute result shape — got ${typeof result}`,
  );
}
