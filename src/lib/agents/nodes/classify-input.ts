import { z } from "zod";
import type { Runnable } from "@langchain/core/runnables";
import type { BaseMessageLike } from "@langchain/core/messages";

import { scanForCrisis } from "@/lib/safety/crisis-scanner";
import type { Intent } from "@/lib/types";
import { makeChatModel } from "@/lib/agents/llm";
import { CLASSIFY_PROMPT } from "@/lib/agents/prompts/classify";
import type { GraphState, GraphStateUpdate } from "@/lib/agents/state";

const INTENTS: Intent[] = ["crisis", "distress", "reflection", "growth"];

export const ClassifySchema = z.object({
  intent: z.enum(["crisis", "distress", "reflection", "growth"]),
  severity: z.number().int().min(0).max(10),
  mood_score: z.number().min(-1).max(1),
  emotions: z.array(z.string()).min(1).max(3),
});

export type ClassifyOutput = z.infer<typeof ClassifySchema>;

/**
 * Injectable runnable shape so tests can provide a mock without touching
 * the network. The production builder `defaultClassifier()` returns an
 * LLM bound to the classify schema.
 */
export type ClassifierRunnable = Runnable<BaseMessageLike[], ClassifyOutput>;

export function defaultClassifier(): ClassifierRunnable {
  const llm = makeChatModel({ temperature: 0 });
  return llm.withStructuredOutput(ClassifySchema) as ClassifierRunnable;
}

/**
 * Two-layer classifier:
 *   - regex keyword scan (one-way override toward crisis)
 *   - LLM call with enforced schema
 *
 * The keyword scan wins in the crisis direction: if it detects but the
 * LLM disagrees, we still treat as crisis with severity clamped to >= 8.
 */
export function makeClassifyInput(
  classifier: ClassifierRunnable = defaultClassifier(),
) {
  return async function classifyInput(
    state: GraphState,
  ): Promise<GraphStateUpdate> {
    const scan = scanForCrisis(state.transcript);

    const llm = await classifier.invoke([
      { role: "system", content: CLASSIFY_PROMPT },
      { role: "user", content: state.transcript },
    ]);

    const intent: Intent = scan.detected ? "crisis" : llm.intent;
    const severity = scan.detected
      ? Math.max(8, llm.severity)
      : llm.severity;

    // Defensive: LLM is schema-bound, but if somehow an unknown intent
    // leaks through (future Gemini version / partial parse) treat as
    // reflection which is the "safe middle" for non-crisis routing.
    const safeIntent: Intent = INTENTS.includes(intent) ? intent : "reflection";

    return {
      intent: safeIntent,
      severity,
      mood_score: llm.mood_score,
      emotions: llm.emotions,
      crisis_keywords_detected: scan.keywords,
      needs_immediate_intervention: scan.detected,
    };
  };
}
