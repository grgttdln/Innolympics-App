#!/usr/bin/env tsx
/**
 * Ad-hoc verification that the journaling tables + pgvector extension
 * exist. Not wired into package.json — invoked manually during setup.
 */
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });

async function main(): Promise<void> {
  const sql = neon(process.env.DATABASE_URL!);

  const ext = (await sql`
    SELECT extname FROM pg_extension WHERE extname = 'vector'
  `) as { extname: string }[];

  const tables = (await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_name IN ('journal_entries', 'escalation_events')
    ORDER BY table_name
  `) as { table_name: string }[];

  const idx = (await sql`
    SELECT indexname
    FROM pg_indexes
    WHERE tablename IN ('journal_entries', 'escalation_events')
    ORDER BY indexname
  `) as { indexname: string }[];

  const cols = (await sql`
    SELECT column_name, data_type, udt_name
    FROM information_schema.columns
    WHERE table_name = 'journal_entries'
    ORDER BY ordinal_position
  `) as { column_name: string; data_type: string; udt_name: string }[];

  console.log(JSON.stringify({ ext, tables, idx, cols }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
