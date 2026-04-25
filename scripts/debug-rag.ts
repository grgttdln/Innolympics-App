#!/usr/bin/env tsx
/**
 * Diagnose the RAG path end-to-end for a single user.
 *
 * Runs three probes in order:
 *   1. Raw count of entries with / without embeddings for the user.
 *   2. Raw shape inspection: what does drizzle's db.execute return?
 *   3. Calls searchMemory() with the most recent entry's embedding and
 *      prints whatever comes back.
 *
 * Usage: `npx tsx scripts/debug-rag.ts <userId>`
 */
import { config } from "dotenv";

config({ path: ".env.local" });

async function main(): Promise<void> {
  const argUserId = process.argv[2];
  const userId = Number(argUserId);
  if (!Number.isFinite(userId)) {
    console.error("usage: npx tsx scripts/debug-rag.ts <userId>");
    process.exit(1);
  }

  const { db } = await import("../src/lib/db");
  const { searchMemory } = await import("../src/lib/memory/rag");
  const { sql } = await import("drizzle-orm");

  // --- Probe 1: row counts ---------------------------------------------
  const countsRaw = await db.execute(sql`
    SELECT
      COUNT(*)::int AS total,
      COUNT(embedding)::int AS with_embedding,
      COUNT(*) FILTER (WHERE embedding IS NULL)::int AS without_embedding
    FROM journal_entries
    WHERE user_id = ${userId}
  `);
  console.log("\n=== Probe 1: entry counts ===");
  console.log("raw countsRaw:", JSON.stringify(countsRaw, null, 2));

  // --- Probe 2: shape inspection of db.execute -------------------------
  const sample = await db.execute(sql`
    SELECT id, transcript, created_at
    FROM journal_entries
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT 2
  `);
  console.log("\n=== Probe 2: db.execute return shape ===");
  console.log("typeof sample:", typeof sample);
  console.log("Array.isArray(sample):", Array.isArray(sample));
  console.log("sample keys:", sample && typeof sample === "object" ? Object.keys(sample as object) : "n/a");
  console.log("sample preview:", JSON.stringify(sample, null, 2).slice(0, 800));

  // --- Probe 3: real searchMemory run using the latest embedding -------
  const latest = (await db.execute(sql`
    SELECT embedding::text AS emb_text
    FROM journal_entries
    WHERE user_id = ${userId} AND embedding IS NOT NULL
    ORDER BY created_at DESC
    LIMIT 1
  `)) as unknown;

  // drizzle-neon-http wraps results under .rows in some versions and not
  // in others. Handle both, let us see clearly which branch we hit.
  const latestRows =
    Array.isArray(latest)
      ? latest
      : (latest as { rows?: unknown[] })?.rows ?? [];
  console.log("\n=== Probe 3: searchMemory ===");
  console.log(`latest-embedding rows found: ${latestRows.length}`);

  if (latestRows.length === 0) {
    console.log("No rows with embedding — skipping searchMemory.");
    return;
  }

  const embText = (latestRows[0] as { emb_text: string }).emb_text;
  // embText is a pgvector textual form like "[0.1,0.2,...]". Parse it.
  const vec = embText
    .replace(/^\[|\]$/g, "")
    .split(",")
    .map(Number);
  console.log(`parsed vector dim: ${vec.length}`);

  const results = await searchMemory(userId, vec, 5);
  console.log(`searchMemory returned ${results.length} entries:`);
  for (const r of results) {
    console.log(
      `  [${r.created_at}] mood=${r.mood_score} emotions=${JSON.stringify(r.emotions)}\n    "${r.transcript.slice(0, 120).replace(/\n/g, " ")}${r.transcript.length > 120 ? "…" : ""}"`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
