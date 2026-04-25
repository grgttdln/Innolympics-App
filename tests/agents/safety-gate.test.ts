import { describe, expect, it } from "vitest";
import { RunnableLambda } from "@langchain/core/runnables";

import {
  makeSafetyGate,
  MAX_SAFETY_RETRIES,
  type SafetyRunnable,
  type SafetyVerdict,
} from "@/lib/agents/nodes/safety-gate";
import { SAFE_FALLBACK_TEXT } from "@/lib/safety/crisis-templates";
import type { GraphState } from "@/lib/agents/state";

function fixedVerdict(v: SafetyVerdict): SafetyRunnable {
  return RunnableLambda.from(async () => v) as unknown as SafetyRunnable;
}

function baseState(overrides: Partial<GraphState> = {}): GraphState {
  return {
    transcript: "I had a rough day",
    input_type: "text",
    user_id: 1,
    intent: "reflection",
    severity: 4,
    mood_score: -0.3,
    emotions: ["tired"],
    crisis_keywords_detected: [],
    needs_immediate_intervention: false,
    memory_context: [],
    draft_response: "Hi. That sounds tough. What were you feeling?",
    safety_passed: false,
    safety_retry_count: 0,
    retry_reason: null,
    flagged: false,
    needs_escalation: false,
    entry_id: null,
    ...overrides,
  };
}

describe("safety_gate", () => {
  it("bypasses the gate when intent is crisis", async () => {
    // Even if the runnable would fail, crisis never calls it.
    const fail = RunnableLambda.from(async () => {
      throw new Error("runnable should not be called");
    }) as unknown as SafetyRunnable;

    const gate = makeSafetyGate(fail);
    const result = await gate(baseState({ intent: "crisis" }));
    expect(result.safety_passed).toBe(true);
    expect(result.retry_reason).toBeNull();
  });

  it("passes a safe draft", async () => {
    const gate = makeSafetyGate(fixedVerdict({ pass: true, reason: "" }));
    const result = await gate(baseState());
    expect(result.safety_passed).toBe(true);
    expect(result.retry_reason).toBeNull();
  });

  it("increments retry_count and sets retry_reason on first failure", async () => {
    const gate = makeSafetyGate(
      fixedVerdict({ pass: false, reason: "Remove medication suggestion" }),
    );
    const result = await gate(baseState({ safety_retry_count: 0 }));
    expect(result.safety_passed).toBe(false);
    expect(result.safety_retry_count).toBe(1);
    expect(result.retry_reason).toBe("Remove medication suggestion");
    expect(result.draft_response).toBeUndefined();
  });

  it("increments retry_count on the second failure", async () => {
    const gate = makeSafetyGate(
      fixedVerdict({ pass: false, reason: "Tone too cheerful" }),
    );
    const result = await gate(baseState({ safety_retry_count: 1 }));
    expect(result.safety_passed).toBe(false);
    expect(result.safety_retry_count).toBe(2);
    expect(result.retry_reason).toBe("Tone too cheerful");
  });

  it("swaps in SAFE_FALLBACK_TEXT after the max retries are exhausted", async () => {
    const gate = makeSafetyGate(
      fixedVerdict({ pass: false, reason: "still bad" }),
    );
    const result = await gate(
      baseState({ safety_retry_count: MAX_SAFETY_RETRIES }),
    );
    expect(result.safety_passed).toBe(true);
    expect(result.draft_response).toBe(SAFE_FALLBACK_TEXT);
    expect(result.retry_reason).toBeNull();
  });

  it("uses a default retry_reason if the verdict omits one", async () => {
    const gate = makeSafetyGate(fixedVerdict({ pass: false, reason: "" }));
    const result = await gate(baseState());
    expect(result.retry_reason).not.toBeNull();
    expect(typeof result.retry_reason).toBe("string");
    expect((result.retry_reason as string).length).toBeGreaterThan(0);
  });
});
