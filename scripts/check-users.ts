#!/usr/bin/env tsx
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });

async function main(): Promise<void> {
  const sql = neon(process.env.DATABASE_URL!);
  const users = (await sql`SELECT id, email, name FROM users ORDER BY id`) as {
    id: number;
    email: string;
    name: string;
  }[];
  const entryCounts = (await sql`
    SELECT user_id, COUNT(*)::int AS total
    FROM journal_entries
    GROUP BY user_id
    ORDER BY user_id
  `) as { user_id: number; total: number }[];
  console.log("users:");
  console.table(users);
  console.log("\njournal_entries counts per user:");
  console.table(entryCounts);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
