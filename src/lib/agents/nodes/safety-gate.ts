import { z } from "zod";
import type { Runnable } from "@langchain/core/runnables";
import type { BaseMessageLike } from "@langchain/core/messages";

import { makeChatModel } from "@/lib/agents/llm";
import {
  SAFETY_SYSTEM_PROMPT,
  renderSafetyInput,
} from "@/lib/agents/prompts/safety";
import { SAFE_FALLBACK_TEXT } from "@/lib/safety/crisis-templates";
import type { GraphState, GraphStateUpdate } from "@/lib/agents/state";

export const SafetySchema = z.object({
  pass: z.boolean(),
  reason: z.string(),
});

export type SafetyVerdict = z.infer<typeof SafetySchema>;
export type SafetyRunnable = Runnable<BaseMessageLike[], SafetyVerdict>;

export const MAX_SAFETY_RETRIES = 2;

export function defaultSafetyRunnable(): SafetyRunnable {
  const llm = makeChatModel({ temperature: 0 });
  return llm.withStructuredOutput(SafetySchema) as SafetyRunnable;
}

/**
 * Evaluator node. Crisis intents bypass — their template is already safe.
 * Non-crisis drafts get an LLM review; on failure we either loop back to
 * the handler (with `retry_reason`) or, on the third failure, swap in a
 * generic safe fallback and allow the graph to continue.
 */
export function makeSafetyGate(
  runnable: SafetyRunnable = defaultSafetyRunnable(),
) {
  return async function safetyGate(
    state: GraphState,
  ): Promise<GraphStateUpdate> {
    if (state.intent === "crisis") {
      return { safety_passed: true, retry_reason: null };
    }

    const verdict = await runnable.invoke([
      { role: "system", content: SAFETY_SYSTEM_PROMPT },
      {
        role: "user",
        content: renderSafetyInput({
          draft: state.draft_response,
          intent: state.intent ?? "unknown",
          severity: state.severity,
          emotions: state.emotions,
        }),
      },
    ]);

    if (verdict.pass) {
      return { safety_passed: true, retry_reason: null };
    }

    if (state.safety_retry_count < MAX_SAFETY_RETRIES) {
      return {
        safety_passed: false,
        safety_retry_count: state.safety_retry_count + 1,
        retry_reason: verdict.reason || "Rewrite with care.",
      };
    }

    // Exhausted retries — return the generic safe fallback.
    return {
      safety_passed: true,
      retry_reason: null,
      draft_response: SAFE_FALLBACK_TEXT,
    };
  };
}
