#!/usr/bin/env tsx
/**
 * End-to-end smoke test of the LangGraph pipeline without a running
 * Next.js server. Requires GEMINI_API_KEY + DATABASE_URL in .env.local.
 *
 * Creates a test user if none exists, then runs 4 transcripts — one per
 * intent — and prints classification + response previews.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

async function main(): Promise<void> {
  const { runJournalGraph } = await import("../src/lib/agents/graph");
  const { db } = await import("../src/lib/db");
  const { users, journalEntries, escalationEvents } = await import(
    "../src/lib/db/schema"
  );
  const { eq, desc } = await import("drizzle-orm");

  // Ensure a test user exists.
  let [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, "smoke@local.test"))
    .limit(1);
  if (!user) {
    const [row] = await db
      .insert(users)
      .values({
        email: "smoke@local.test",
        name: "Smoke Test",
        passwordHash: "not-real",
      })
      .returning({ id: users.id });
    user = row;
    console.log(`created test user id=${user.id}`);
  } else {
    console.log(`reusing test user id=${user.id}`);
  }

  const cases = [
    { label: "GROWTH", transcript: "I finally finished the project I've been worried about, and I feel proud and relieved." },
    { label: "REFLECTION", transcript: "Work was tiring. I keep feeling like I'm behind, but I'm not sure why yet." },
    { label: "DISTRESS", transcript: "I'm panicking right now. My chest is tight, I can't focus, everything feels too fast." },
    { label: "CRISIS", transcript: "I honestly just want to kill myself. I can't keep going." },
  ];

  for (const { label, transcript } of cases) {
    console.log(`\n--- ${label} ---`);
    const t0 = Date.now();
    const state = await runJournalGraph({
      transcript,
      input_type: "text",
      user_id: user.id,
    });
    const elapsed = Date.now() - t0;
    console.log(`intent=${state.intent} severity=${state.severity} mood=${state.mood_score.toFixed(2)} emotions=${JSON.stringify(state.emotions)}`);
    console.log(`flagged=${state.flagged} needs_escalation=${state.needs_escalation} entry_id=${state.entry_id} (${elapsed}ms)`);
    console.log(`response preview: ${state.draft_response.slice(0, 160).replace(/\n/g, " ")}${state.draft_response.length > 160 ? "…" : ""}`);
  }

  console.log("\n--- DB audit ---");
  const entries = await db
    .select({
      id: journalEntries.id,
      intent: journalEntries.intent,
      severity: journalEntries.severity,
      flagged: journalEntries.flagged,
    })
    .from(journalEntries)
    .where(eq(journalEntries.userId, user.id))
    .orderBy(desc(journalEntries.createdAt))
    .limit(10);
  const escs = await db
    .select({
      triggerType: escalationEvents.triggerType,
      severity: escalationEvents.severity,
    })
    .from(escalationEvents)
    .where(eq(escalationEvents.userId, user.id))
    .orderBy(desc(escalationEvents.createdAt))
    .limit(10);
  console.log(`journal_entries rows (recent 10): ${entries.length}`);
  console.log(JSON.stringify(entries, null, 2));
  console.log(`escalation_events rows (recent 10): ${escs.length}`);
  console.log(JSON.stringify(escs, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
