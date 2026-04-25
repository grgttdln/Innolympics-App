import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/api/require-user";
import { db } from "@/lib/db";
import { escalationEvents } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  trigger_type: z.enum(["crisis_flag", "mood_decline", "keyword_match"]),
  severity: z.number().int().min(0).max(10),
  entry_id: z.string().uuid().optional().nullable(),
  context: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Client-side crisis interceptor and other surfaces can log escalation
 * events directly. Fire-and-forget — the route responds fast with the
 * new id, caller doesn't block on it.
 */
export async function POST(request: Request): Promise<Response> {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  const raw = await request.json().catch(() => null);
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const [row] = await db
    .insert(escalationEvents)
    .values({
      userId: auth.userId,
      triggerType: parsed.data.trigger_type,
      severity: parsed.data.severity,
      entryId: parsed.data.entry_id ?? null,
      context: parsed.data.context ?? {},
    })
    .returning({ id: escalationEvents.id });

  return NextResponse.json({ id: row.id });
}
