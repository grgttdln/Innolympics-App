import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

/**
 * GA lite model — the 3.1 preview model is unreliable (frequent 503
 * UNAVAILABLE during high demand).
 */
const MODEL = "gemini-2.5-flash-lite";

/**
 * Factory for a configured chat model. Each node constructs its own
 * instance so per-call temperature / structured-output schema stay local.
 */
export function makeChatModel(options: {
  temperature: number;
  maxOutputTokens?: number;
}): ChatGoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  return new ChatGoogleGenerativeAI({
    model: MODEL,
    apiKey,
    temperature: options.temperature,
    maxOutputTokens: options.maxOutputTokens ?? 512,
  });
}
