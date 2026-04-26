import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { journalEntries } from "@/lib/db/schema";
import { requireUser } from "@/lib/api/require-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_ENTRIES = 3;

const MODEL = "gemini-2.5-flash-lite";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const TIMEOUT_MS = 12_000;

const SYSTEM_PROMPT = `You are "Tala", a gentle and empathetic AI wellness companion for a journaling app.

You will receive the user's 3 most recent journal entries with their mood and emotions metadata.

Your task: produce a SHORT wellness check-in insight (2–3 sentences max).
- Be warm, supportive, and grounded.
- Reference patterns you notice across the entries (mood trends, recurring emotions, themes).
- Do NOT diagnose, prescribe, or give medical advice.
- Do NOT repeat the user's words verbatim — synthesize and reflect.
- If the entries show positive trends, gently affirm. If they show struggle, acknowledge with compassion.
- Respond in the same language the user wrote in.
- Output ONLY the insight text. No JSON, no markdown, no preamble.`;

const SAFETY_SETTINGS = [
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
];

function buildPrompt(
  entries: { transcript: string; moodScore: number; emotions: string[]; intent: string; createdAt: Date }[],
): string {
  return entries
    .map(
      (e, i) =>
        `--- Entry ${i + 1} (${e.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}) ---\n` +
        `Mood score: ${e.moodScore} | Emotions: ${e.emotions.join(", ") || "none"} | Intent: ${e.intent}\n` +
        `"${e.transcript.slice(0, 600)}"`,
    )
    .join("\n\n");
}

export async function GET(request: Request): Promise<Response> {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  /* 1. Fetch 3 most recent entries */
  const rows = await db
    .select({
      transcript: journalEntries.transcript,
      moodScore: journalEntries.moodScore,
      emotions: journalEntries.emotions,
      intent: journalEntries.intent,
      createdAt: journalEntries.createdAt,
    })
    .from(journalEntries)
    .where(eq(journalEntries.userId, auth.userId))
    .orderBy(desc(journalEntries.createdAt))
    .limit(MIN_ENTRIES);

  /* 2. Not enough entries → skip */
  if (rows.length < MIN_ENTRIES) {
    return NextResponse.json({ insight: null });
  }

  /* 3. Call Gemini */
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ insight: null });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: buildPrompt(rows) }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 180,
        },
        safetySettings: SAFETY_SETTINGS,
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ insight: null });
    }

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) {
      return NextResponse.json({ insight: null });
    }

    return NextResponse.json({ insight: text });
  } catch {
    return NextResponse.json({ insight: null });
  } finally {
    clearTimeout(timeout);
  }
}
