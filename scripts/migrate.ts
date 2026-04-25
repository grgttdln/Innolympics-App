#!/usr/bin/env tsx
/**
 * Minimal migration runner for Neon HTTP driver.
 *
 * drizzle-kit's `migrate` works with node-postgres/pg. The repo uses the
 * HTTP-only driver which drizzle-kit doesn't wire for migrations, and
 * drizzle-kit push can't represent `CREATE EXTENSION`. So we run the raw
 * SQL ourselves and track applied migrations in a `__migrations` table.
 *
 * Usage: `npm run db:migrate`
 */
import { config } from "dotenv";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = neon(DATABASE_URL);

const MIGRATIONS_DIR = resolve(process.cwd(), "drizzle");

async function ensureTable(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS __migrations (
      tag TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
}

/**
 * The db predates this runner — earlier tables were created via drizzle-kit
 * `db:push`. On first run, if the legacy `users` / `posts` tables already
 * exist AND the __migrations table is empty, backfill the prior tags so we
 * don't try to re-apply them.
 */
async function bootstrapExistingSchema(): Promise<void> {
  const existing = (await sql`
    SELECT COUNT(*)::int AS n FROM __migrations
  `) as { n: number }[];
  if (existing[0].n > 0) return;

  const tableRows = (await sql`
    SELECT to_regclass('public.users') AS users,
           to_regclass('public.posts') AS posts
  `) as { users: string | null; posts: string | null }[];

  if (tableRows[0].users && tableRows[0].posts) {
    console.log(
      "bootstrap: detected pre-existing users/posts tables — marking 0000_init, 0001_tearful_hedge_knight, 0002_friendly_lester as applied",
    );
    for (const tag of [
      "0000_init",
      "0001_tearful_hedge_knight",
      "0002_friendly_lester",
    ]) {
      await sql`
        INSERT INTO __migrations (tag) VALUES (${tag})
        ON CONFLICT (tag) DO NOTHING
      `;
    }
  }
}

async function appliedTags(): Promise<Set<string>> {
  const rows = (await sql`SELECT tag FROM __migrations`) as { tag: string }[];
  return new Set(rows.map((r) => r.tag));
}

function discoverMigrations(): { tag: string; file: string; sql: string }[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => ({
      tag: f.replace(/\.sql$/, ""),
      file: f,
      sql: readFileSync(resolve(MIGRATIONS_DIR, f), "utf8"),
    }));
}

function splitStatements(raw: string): string[] {
  return raw
    .split(/-->\s*statement-breakpoint/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

async function runMigration(
  tag: string,
  statements: string[],
): Promise<void> {
  for (const [i, stmt] of statements.entries()) {
    try {
      await sql.query(stmt);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      throw new Error(
        `Migration ${tag} failed at statement ${i + 1}:\n${stmt}\n\nReason: ${reason}`,
      );
    }
  }
  await sql`INSERT INTO __migrations (tag) VALUES (${tag})`;
}

async function main(): Promise<void> {
  await ensureTable();
  await bootstrapExistingSchema();
  const applied = await appliedTags();
  const migrations = discoverMigrations();

  let ranAny = false;
  for (const m of migrations) {
    if (applied.has(m.tag)) {
      console.log(`skip  ${m.tag} (already applied)`);
      continue;
    }
    console.log(`apply ${m.tag}`);
    const statements = splitStatements(m.sql);
    await runMigration(m.tag, statements);
    ranAny = true;
    console.log(`  ok  ${statements.length} statement(s)`);
  }

  if (!ranAny) console.log("nothing to do — all migrations applied");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
