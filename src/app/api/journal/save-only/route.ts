import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/api/require-user";
import { db } from "@/lib/db";
import { journalEntries } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  transcript: z.string().min(1).max(10_000),
  input_type: z.enum(["text", "voice"]),
});

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

  try {
    const [row] = await db
      .insert(journalEntries)
      .values({
        userId: auth.userId,
        transcript: parsed.data.transcript,
        aiResponse: null,
        intent: "reflection",
        severity: 0,
        moodScore: 0,
        emotions: [],
        flagged: false,
        embedding: null,
        inputType: parsed.data.input_type,
      })
      .returning({ id: journalEntries.id });

    return NextResponse.json({ entry_id: row.id });
  } catch (err) {
    console.error("/api/journal/save-only error", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
