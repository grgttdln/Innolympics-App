import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = "models/gemini-3.1-flash-live-preview";

export async function POST() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
  }

  try {
    const ai = new GoogleGenAI({ apiKey, apiVersion: "v1alpha" });
    const token = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        newSessionExpireTime: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
        liveConnectConstraints: {
          model: MODEL,
        },
      },
    });

    if (!token.name) {
      return NextResponse.json({ error: "Token minting returned no name" }, { status: 502 });
    }

    return NextResponse.json({ token: token.name, model: MODEL });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Token creation failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
