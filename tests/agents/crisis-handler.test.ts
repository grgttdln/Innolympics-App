import { describe, expect, it, vi } from "vitest";
import { makeCrisisHandler } from "@/lib/agents/nodes/crisis-handler";
import { CRISIS_HANDLER_PH } from "@/lib/safety/crisis-templates";
import type { GraphState } from "@/lib/agents/state";

function baseState(overrides: Partial<GraphState> = {}): GraphState {
  return {
    transcript: "i want to kill myself",
    input_type: "text",
    user_id: 42,
    intent: "crisis",
    severity: 10,
    mood_score: -1,
    emotions: ["hopeless"],
    crisis_keywords_detected: ["kill myself"],
    needs_immediate_intervention: true,
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

describe("crisis_handler", () => {
  it("returns the static PH crisis template", async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    const crisisHandler = makeCrisisHandler(write);
    const result = await crisisHandler(baseState());
    expect(result.draft_response).toBe(CRISIS_HANDLER_PH);
    expect(result.safety_passed).toBe(true);
    expect(result.flagged).toBe(true);
  });

  it("writes an escalation event awaited before returning", async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    const crisisHandler = makeCrisisHandler(write);
    await crisisHandler(baseState({ severity: 9 }));
    expect(write).toHaveBeenCalledOnce();
    const arg = write.mock.calls[0][0];
    expect(arg.userId).toBe(42);
    expect(arg.severity).toBe(9);
    expect(arg.context.intent).toBe("crisis");
    expect(arg.context.crisis_keywords_detected).toContain("kill myself");
  });

  it("truncates the transcript excerpt to 500 chars", async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    const crisisHandler = makeCrisisHandler(write);
    const long = "a".repeat(2000);
    await crisisHandler(baseState({ transcript: long }));
    const arg = write.mock.calls[0][0];
    expect(arg.context.transcript_excerpt).toHaveLength(500);
  });

  it("propagates writer failures (fail-loud on crisis logging)", async () => {
    const write = vi.fn().mockRejectedValue(new Error("db down"));
    const crisisHandler = makeCrisisHandler(write);
    await expect(crisisHandler(baseState())).rejects.toThrow("db down");
  });
});
