import { describe, expect, it } from "vitest";
import { RunnableLambda } from "@langchain/core/runnables";

import {
  makeClassifyInput,
  type ClassifyOutput,
  type ClassifierRunnable,
} from "@/lib/agents/nodes/classify-input";
import type { GraphState } from "@/lib/agents/state";

function mockClassifier(fixedOutput: ClassifyOutput): ClassifierRunnable {
  return RunnableLambda.from(
    async () => fixedOutput,
  ) as unknown as ClassifierRunnable;
}

function baseState(overrides: Partial<GraphState> = {}): GraphState {
  return {
    transcript: "",
    input_type: "text",
    user_id: 1,
    intent: null,
    severity: 0,
    mood_score: 0,
    emotions: [],
    crisis_keywords_detected: [],
    needs_immediate_intervention: false,
    memory_context: [],
    draft_response: "",
    safety_passed: false,
    safety_retry_count: 0,
    retry_reason: null,
    flagged: false,
    needs_escalation: false,
    entry_id: null,
    ...overrides,
  };
}

describe("classify_input", () => {
  it("passes through LLM classification when no crisis keywords", async () => {
    const classify = makeClassifyInput(
      mockClassifier({
        intent: "reflection",
        severity: 3,
        mood_score: -0.2,
        emotions: ["anxious", "tired"],
      }),
    );
    const result = await classify(
      baseState({ transcript: "Work was tough today, I'm a bit drained." }),
    );
    expect(result.intent).toBe("reflection");
    expect(result.severity).toBe(3);
    expect(result.mood_score).toBe(-0.2);
    expect(result.emotions).toEqual(["anxious", "tired"]);
    expect(result.crisis_keywords_detected).toEqual([]);
    expect(result.needs_immediate_intervention).toBe(false);
  });

  it("overrides LLM classification when keyword scan detects crisis", async () => {
    // LLM missed it and said "reflection" with low severity.
    const classify = makeClassifyInput(
      mockClassifier({
        intent: "reflection",
        severity: 3,
        mood_score: -0.4,
        emotions: ["sad"],
      }),
    );
    const result = await classify(
      baseState({ transcript: "honestly I just want to kill myself" }),
    );
    expect(result.intent).toBe("crisis");
    expect(result.severity).toBeGreaterThanOrEqual(8);
    expect(result.crisis_keywords_detected).toContain("kill myself");
    expect(result.needs_immediate_intervention).toBe(true);
  });

  it("does not downgrade LLM-reported severity when keyword matches", async () => {
    // LLM said crisis severity 10 — keyword scan should not lower it.
    const classify = makeClassifyInput(
      mockClassifier({
        intent: "crisis",
        severity: 10,
        mood_score: -1,
        emotions: ["hopeless"],
      }),
    );
    const result = await classify(
      baseState({ transcript: "I want to end my life" }),
    );
    expect(result.intent).toBe("crisis");
    expect(result.severity).toBe(10);
  });

  it("trusts LLM crisis classification even when keywords miss", async () => {
    // Subtle phrasing the regex would not catch.
    const classify = makeClassifyInput(
      mockClassifier({
        intent: "crisis",
        severity: 9,
        mood_score: -0.9,
        emotions: ["hopeless"],
      }),
    );
    const result = await classify(
      baseState({ transcript: "I don't see the point in anything anymore" }),
    );
    expect(result.intent).toBe("crisis");
    expect(result.severity).toBe(9);
    expect(result.needs_immediate_intervention).toBe(false);
  });

  it("falls back to reflection on unexpected LLM intent", async () => {
    const classify = makeClassifyInput(
      // Deliberately cast to bypass schema at the test boundary —
      // simulates a hypothetical future leak.
      mockClassifier({
        intent: "reflection",
        severity: 2,
        mood_score: 0.1,
        emotions: ["neutral"],
      } as ClassifyOutput),
    );
    const result = await classify(baseState({ transcript: "nothing special" }));
    expect(result.intent).toBe("reflection");
  });
});
