import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/api/require-user";
import { embedText } from "@/lib/memory/embed";
import { searchMemory } from "@/lib/memory/rag";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  query: z.string().min(1).max(500),
});

/**
 * Gemini function-call target: get_journal_context. Must stay fast (<50ms
 * target, 300ms upper bound). Caller handles timeout and falls back to an
 * empty list if this exceeds the budget.
 */
export async function POST(request: Request): Promise<Response> {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  const raw = await request.json().catch(() => null);
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  try {
    const vec = await embedText(parsed.data.query);
    const entries = await searchMemory(auth.userId, vec, 5);
    return NextResponse.json({ entries });
  } catch (err) {
    console.error("/api/memory/search error", err);
    // Soft-fail: empty result so the voice caller doesn't stall.
    return NextResponse.json({ entries: [] });
  }
}
