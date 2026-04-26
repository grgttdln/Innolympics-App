import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { journalEntries } from "@/lib/db/schema";
import { requireUser } from "@/lib/api/require-user";
import { runJournalGraph } from "@/lib/agents/graph";
import { scanForCrisis } from "@/lib/safety/crisis-scanner";
import { CRISIS_HANDLER_PH } from "@/lib/safety/crisis-templates";
import type { JournalApiResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 100);
  const offset = Math.max(Number(searchParams.get("offset") ?? 0), 0);

  const rows = await db
    .select({
      id: journalEntries.id,
      transcript: journalEntries.transcript,
      aiResponse: journalEntries.aiResponse,
      intent: journalEntries.intent,
      severity: journalEntries.severity,
      moodScore: journalEntries.moodScore,
      emotions: journalEntries.emotions,
      flagged: journalEntries.flagged,
      inputType: journalEntries.inputType,
      createdAt: journalEntries.createdAt,
    })
    .from(journalEntries)
    .where(
      and(
        eq(journalEntries.userId, auth.userId),
        // exclude placeholder mood-only rows inserted by log-mood
        // (they use the sentinel transcript value)
        // We keep all real entries regardless of inputType
      ),
    )
    .orderBy(desc(journalEntries.createdAt))
    .limit(limit)
    .offset(offset);

  return NextResponse.json({ entries: rows });
}

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
    const state = await runJournalGraph({
      transcript: parsed.data.transcript,
      input_type: parsed.data.input_type,
      user_id: auth.userId,
    });

    const response: JournalApiResponse = {
      intent: state.intent ?? "reflection",
      severity: state.severity,
      mood_score: state.mood_score,
      emotions: state.emotions,
      response: state.draft_response,
      flagged: state.flagged,
      needs_escalation: state.needs_escalation,
      entry_id: state.entry_id ?? "",
    };
    return NextResponse.json(response);
  } catch (err) {
    // Fail-safe: if the graph crashed and the input contains crisis keywords,
    // still return the crisis template so the user sees hotlines. This is
    // the spec's "graph-level failure" branch.
    console.error("/api/journal graph error", err);
    const scan = scanForCrisis(parsed.data.transcript);
    if (scan.detected) {
      return NextResponse.json(
        {
          intent: "crisis",
          severity: 10,
          mood_score: -1,
          emotions: [],
          response: CRISIS_HANDLER_PH,
          flagged: true,
          needs_escalation: true,
          entry_id: "",
        } satisfies JournalApiResponse,
        { status: 200 },
      );
    }
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 },
    );
  }
}
