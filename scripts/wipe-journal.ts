#!/usr/bin/env tsx
/**
 * Ad-hoc maintenance script: truncate journal_entries + escalation_events.
 * Leaves users / posts / any other table untouched.
 * Not wired into package.json — run with `npx tsx scripts/wipe-journal.ts`.
 */
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });

async function main(): Promise<void> {
  const sql = neon(process.env.DATABASE_URL!);

  const before = (await sql`
    SELECT
      (SELECT count(*) FROM journal_entries)::int AS entries,
      (SELECT count(*) FROM escalation_events)::int AS escalations
  `) as { entries: number; escalations: number }[];

  console.log(
    `before: ${before[0].entries} journal_entries, ${before[0].escalations} escalation_events`,
  );

  // CASCADE handles the escalation_events.entry_id → journal_entries.id FK.
  await sql`TRUNCATE TABLE escalation_events, journal_entries RESTART IDENTITY CASCADE`;

  const after = (await sql`
    SELECT
      (SELECT count(*) FROM journal_entries)::int AS entries,
      (SELECT count(*) FROM escalation_events)::int AS escalations
  `) as { entries: number; escalations: number }[];

  console.log(
    `after:  ${after[0].entries} journal_entries, ${after[0].escalations} escalation_events`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
