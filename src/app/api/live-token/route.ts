import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Returns the raw GEMINI_API_KEY so the client SDK can open a Live
 * session. We briefly tried ephemeral tokens via `authTokens.create`,
 * but the 1-use cap + v1alpha requirement was fragile under React's
 * dev-mode double-mount and caused intermittent "live session
 * disconnected" failures. Restored to the simpler shape; revisiting
 * ephemeral tokens as a dedicated hardening task.
 *
 * NOTE: this returns a secret to the browser. Acceptable short-term
 * for the dev/preview environment; before production we should
 * either (a) get ephemeral tokens stable, or (b) proxy the WebSocket
 * server-side so the key never leaves the backend.
 */
const MODEL = "models/gemini-3.1-flash-live-preview";

export async function POST() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY not configured" },
      { status: 500 },
    );
  }
  return NextResponse.json({ token: apiKey, model: MODEL });
}
