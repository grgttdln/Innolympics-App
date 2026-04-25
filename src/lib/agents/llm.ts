import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

/**
 * All LangGraph nodes use the same Gemini model. The repo is already on
 * 3.1-flash-lite-preview for follow-up suggestions, so we stay on it for
 * consistency and cost.
 */
const MODEL = "gemini-3.1-flash-lite-preview";

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
