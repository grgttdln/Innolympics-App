# Database Setup — Neon + Drizzle

Quick reference for how the Innolympics app talks to Postgres.

## Stack

- **Neon** — serverless Postgres (hosted)
- **Drizzle ORM** — type-safe query builder + schema
- **`@neondatabase/serverless`** — HTTP driver, works from serverless/edge runtimes
- **`drizzle-kit`** — CLI for generating SQL migrations from the schema

## Files

| File | Purpose |
|---|---|
| `src/lib/db/schema.ts` | Table definitions — edit this to change the DB |
| `src/lib/db/index.ts` | Exports the `db` client used throughout the app |
| `drizzle.config.ts` | Config for `drizzle-kit` (schema path, output dir, credentials) |
| `drizzle/000X_*.sql` | Generated SQL migrations — **paste into Neon SQL Editor** |
| `drizzle/meta/` | Drizzle's internal snapshots (don't edit) |
| `.env.example` | Template for `DATABASE_URL` |
| `.env.local` | Actual Neon connection string (gitignored) |

## Environment

`.env.local` at project root:

```
DATABASE_URL="postgresql://neondb_owner:***@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require"
```

Get it from **Neon console → project → Connect** (leave pooled connection ON).

## Workflow: changing the schema

1. Edit `src/lib/db/schema.ts` — add/modify tables.
2. Generate a migration:
   ```
   npm run db:generate
   ```
   This creates a new file in `drizzle/` (e.g. `0001_something.sql`).
3. Open the new `.sql` file, copy its contents.
4. Paste into **Neon SQL Editor** and run.

### Alternative: push directly (no SQL file)

```
npm run db:push
```
Applies the schema directly to Neon. Good for rapid prototyping, but you lose the audit trail of migration files.

## Scripts

| Command | What it does |
|---|---|
| `npm run db:generate` | Diff schema vs. last snapshot → write SQL migration |
| `npm run db:push` | Sync schema straight to Neon (no migration file) |
| `npm run db:studio` | Open Drizzle Studio (GUI for browsing data) at a local URL |

## Using the DB in code

Server components, route handlers, and server actions:

```ts
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

const rows = await db.select().from(posts).orderBy(desc(posts.createdAt));
```

Insert:

```ts
const [created] = await db
  .insert(posts)
  .values({ title: "Hi", body: "..." })
  .returning();
```

## Smoke test

Route: `src/app/api/posts/route.ts`

```bash
# Create
curl -X POST http://localhost:3000/api/posts \
  -H "Content-Type: application/json" \
  -d '{"title":"Hello","body":"First post"}'

# List
curl http://localhost:3000/api/posts
```

## Current schema

One table, used as a placeholder for early testing:

```ts
posts {
  id         serial PK
  title      text NOT NULL
  body       text NOT NULL
  created_at timestamp NOT NULL DEFAULT now()
}
```

Replace/expand when real domain tables are known.

## Gotchas

- **`.env.local` requires a dev server restart** — Next.js only reads it at startup.
- **Drizzle Studio needs `DATABASE_URL`** set in the shell, not just `.env.local` — the CLI loads `dotenv` via `drizzle.config.ts`, so this should Just Work.
- **No connection pool needed in code** — the Neon HTTP driver (`neon-http`) handles pooling server-side when you use the `-pooler` endpoint.
- **Migrations are manual** — we paste SQL into Neon's editor instead of running `drizzle-kit migrate`, to keep infra simple. If the DB grows, consider automating this.
