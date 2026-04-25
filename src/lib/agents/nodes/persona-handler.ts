import type { Runnable } from "@langchain/core/runnables";
import type { BaseMessageLike } from "@langchain/core/messages";
import type { AIMessageChunk } from "@langchain/core/messages";

import { makeChatModel } from "@/lib/agents/llm";
import { renderMemoryBlock } from "@/lib/agents/prompts/shared";
import type { GraphState, GraphStateUpdate } from "@/lib/agents/state";

/**
 * Tests inject a pre-canned text generator; production wires Gemini.
 * Returning the full message object lets us extract `.content` the same
 * way whether we mock with a string or call the real model.
 */
export type PersonaRunnable = Runnable<BaseMessageLike[], AIMessageChunk>;

export interface PersonaConfig {
  systemPrompt: string;
  temperature: number;
  /** Optional injected runnable for tests. */
  runnable?: PersonaRunnable;
}

function coerceContentToString(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (
          part &&
          typeof part === "object" &&
          "text" in part &&
          typeof part.text === "string"
        ) {
          return part.text;
        }
        return "";
      })
      .join("");
  }
  return "";
}

export function makePersonaHandler({
  systemPrompt,
  temperature,
  runnable,
}: PersonaConfig) {
  const get = (): PersonaRunnable =>
    runnable ?? (makeChatModel({ temperature }) as unknown as PersonaRunnable);

  return async function personaHandler(
    state: GraphState,
  ): Promise<GraphStateUpdate> {
    const memoryBlock = renderMemoryBlock(state.memory_context);
    const retryNote = state.retry_reason
      ? `\n\nIMPORTANT — your previous draft was rejected by the safety reviewer. Reason: ${state.retry_reason}\nRewrite the response fully taking this into account.`
      : "";

    const userContent = [
      `USER TRANSCRIPT:\n${state.transcript}`,
      `DETECTED SEVERITY: ${state.severity} (scale 0-10)`,
      `DETECTED EMOTIONS: ${state.emotions.join(", ") || "(none)"}`,
      `MEMORY CONTEXT (last 5 relevant past entries):\n${memoryBlock}`,
    ].join("\n\n") + retryNote;

    const response = await get().invoke([
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ]);

    const text = coerceContentToString(response.content).trim();
    return {
      draft_response: text || "I'm here with you. Tell me more.",
      // Clear retry_reason so we don't carry it forward accidentally.
      retry_reason: null,
    };
  };
}
