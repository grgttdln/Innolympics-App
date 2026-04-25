import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Mints an ephemeral auth token for Gemini Live so the raw GEMINI_API_KEY
 * never touches the client.
 *
 * Gemini's SDK currently supports ephemeral tokens only on the v1alpha
 * API surface, so both the minter here and the client SDK connection in
 * `use-live-conversation.ts` must opt into v1alpha.
 */
const MODEL = "models/gemini-3.1-flash-live-preview";
const NEW_SESSION_EXPIRE_SECONDS = 60; // window for the client to open the socket
const TOKEN_TTL_MINUTES = 30; // max session length once opened

export async function POST() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY not configured" },
      { status: 500 },
    );
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: { apiVersion: "v1alpha" },
  });

  const now = Date.now();
  const expireTime = new Date(now + TOKEN_TTL_MINUTES * 60_000).toISOString();
  const newSessionExpireTime = new Date(
    now + NEW_SESSION_EXPIRE_SECONDS * 1000,
  ).toISOString();

  try {
    const token = await ai.authTokens.create({
      config: {
        expireTime,
        newSessionExpireTime,
        uses: 1,
        liveConnectConstraints: { model: MODEL },
      },
    });
    if (!token.name) {
      throw new Error("authTokens.create returned no name");
    }
    return NextResponse.json({ token: token.name, model: MODEL });
  } catch (err) {
    console.error("[live-token] mint failed", err);
    return NextResponse.json(
      { error: "Failed to mint ephemeral token" },
      { status: 500 },
    );
  }
}
