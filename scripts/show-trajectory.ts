#!/usr/bin/env tsx
/**
 * For a given userId, print:
 *   - the last 10 journal entries with timestamp, intent, severity, mood
 *   - a quick "strict decline?" verdict over the last 5 moods
 *   - all escalation_events rows for the user
 *
 * Usage: `npx tsx scripts/show-trajectory.ts <userId>`
 */
import { config } from "dotenv";

config({ path: ".env.local" });

async function main(): Promise<void> {
  const argUserId = process.argv[2];
  const userId = Number(argUserId);
  if (!Number.isFinite(userId)) {
    console.error("usage: npx tsx scripts/show-trajectory.ts <userId>");
    process.exit(1);
  }

  const { neon } = await import("@neondatabase/serverless");
  const { isDecliningTrend } = await import("../src/lib/memory/trend");

  const sql = neon(process.env.DATABASE_URL!);

  const entries = (await sql`
    SELECT id, created_at, intent, severity, mood_score, emotions, flagged,
           LEFT(transcript, 100) AS excerpt
    FROM journal_entries
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT 10
  `) as {
    id: string;
    created_at: string;
    intent: string;
    severity: number;
    mood_score: number;
    emotions: string[];
    flagged: boolean;
    excerpt: string;
  }[];

  console.log(`\n=== journal_entries for user ${userId} (newest first) ===`);
  for (const e of entries) {
    const ts = new Date(e.created_at).toLocaleString();
    const mood = e.mood_score.toFixed(2).padStart(5);
    console.log(
      `${ts}  intent=${e.intent.padEnd(10)} sev=${String(e.severity).padStart(2)} mood=${mood} flagged=${e.flagged}\n  emotions: ${JSON.stringify(e.emotions)}\n  "${e.excerpt.replace(/\n/g, " ")}..."\n`,
    );
  }

  const lastFiveMoods = entries.slice(0, 5).map((e) => e.mood_score);
  console.log("=== trend analysis ===");
  console.log(`last 5 moods (newest → oldest): ${JSON.stringify(lastFiveMoods)}`);
  console.log(
    `isDecliningTrend (strict monotonic decline, len >= 3): ${isDecliningTrend(lastFiveMoods)}`,
  );

  // Spell out the pairwise deltas so we can see WHERE the chain broke.
  const oldestFirst = [...lastFiveMoods].reverse();
  console.log("\npairwise (oldest → newest):");
  for (let i = 1; i < oldestFirst.length; i++) {
    const prev = oldestFirst[i - 1];
    const curr = oldestFirst[i];
    const verdict = curr < prev ? "↓ strictly lower" : "✗ not strictly lower";
    console.log(`  ${prev.toFixed(2)} → ${curr.toFixed(2)}  ${verdict}`);
  }

  const escs = (await sql`
    SELECT created_at, trigger_type, severity, entry_id, resolved
    FROM escalation_events
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `) as {
    created_at: string;
    trigger_type: string;
    severity: number;
    entry_id: string | null;
    resolved: boolean;
  }[];

  console.log(`\n=== escalation_events for user ${userId} ===`);
  if (escs.length === 0) {
    console.log("(none)");
  } else {
    for (const e of escs) {
      const ts = new Date(e.created_at).toLocaleString();
      console.log(
        `${ts}  trigger=${e.trigger_type.padEnd(14)} sev=${e.severity} entry=${e.entry_id ?? "—"} resolved=${e.resolved}`,
      );
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
