import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Debug mode: returns the raw API key so the client can connect on v1beta,
// matching the official doc snippet's configuration. Revert to ephemeral
// tokens once the Live session is known to work.
const MODEL = "models/gemini-3.1-flash-live-preview";

export async function POST() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
  }
  return NextResponse.json({ token: apiKey, model: MODEL });
}
