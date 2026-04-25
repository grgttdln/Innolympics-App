import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/api/require-user";
import { logMood } from "@/lib/memory/mood";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  mood_score: z.number().min(-1).max(1),
  emotions: z.array(z.string()).min(1).max(5),
});

/**
 * Gemini function-call target: log_mood_score. Writes a partial
 * voice-mode row immediately; the full row with transcript comes later
 * via the async /api/journal POST on turnComplete.
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
    await logMood(auth.userId, parsed.data.mood_score, parsed.data.emotions);
    return NextResponse.json({ status: "logged" });
  } catch (err) {
    console.error("/api/memory/log-mood error", err);
    // Soft-fail with a 200 so Gemini doesn't retry the tool call.
    return NextResponse.json({ status: "error" });
  }
}
