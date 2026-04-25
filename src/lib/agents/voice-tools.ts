import { Type, type FunctionDeclaration } from "@google/genai";

/**
 * Function declarations passed into `ai.live.connect()` so Gemini Live
 * can call backend memory routes during a voice session.
 *
 * The handlers for these calls live in `use-live-conversation.ts` —
 * they hit `/api/memory/search` and `/api/memory/log-mood` respectively.
 * Both must respond quickly (<300ms) because Live pauses audio output
 * while waiting for a tool response.
 */
export const GET_JOURNAL_CONTEXT: FunctionDeclaration = {
  name: "get_journal_context",
  description:
    "Retrieves relevant past journal entries for the current user to personalize the conversation. Call this early in the session and whenever the user references something they previously discussed.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description:
          "A short natural-language query describing what to search for in past entries, e.g. 'work stress' or 'relationship with brother'.",
      },
    },
    required: ["query"],
  },
};

export const LOG_MOOD_SCORE: FunctionDeclaration = {
  name: "log_mood_score",
  description:
    "Logs the user's current mood assessment. Call this once per session after you have enough context (usually after 2-4 user turns) to assess their emotional state.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      mood_score: {
        type: Type.NUMBER,
        description:
          "Score from -1.0 (extremely negative) to 1.0 (extremely positive). Use fine-grained values — do not default to round numbers.",
      },
      emotions: {
        type: Type.ARRAY,
        description: "1-3 dominant emotions detected, as lowercase strings.",
        items: { type: Type.STRING },
      },
    },
    required: ["mood_score", "emotions"],
  },
};

export const VOICE_TOOLS: FunctionDeclaration[] = [
  GET_JOURNAL_CONTEXT,
  LOG_MOOD_SCORE,
];
