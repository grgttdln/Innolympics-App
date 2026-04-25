import { describe, expect, it, vi } from "vitest";
import { makeCheckEscalation } from "@/lib/agents/nodes/check-escalation";
import type { GraphState } from "@/lib/agents/state";

function baseState(overrides: Partial<GraphState> = {}): GraphState {
  return {
    transcript: "",
    input_type: "text",
    user_id: 7,
    intent: "reflection",
    severity: 3,
    mood_score: -0.2,
    emotions: [],
    crisis_keywords_detected: [],
    needs_immediate_intervention: false,
    memory_context: [],
    draft_response: "",
    safety_passed: true,
    safety_retry_count: 0,
    retry_reason: null,
    flagged: false,
    needs_escalation: false,
    entry_id: "entry-123",
    ...overrides,
  };
}

describe("check_escalation", () => {
  it("short-circuits when intent is crisis (already logged by handler)", async () => {
    const fetchMoods = vi.fn();
    const write = vi.fn();
    const node = makeCheckEscalation(fetchMoods, write);
    const result = await node(baseState({ intent: "crisis" }));
    expect(result.needs_escalation).toBe(true);
    expect(fetchMoods).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
  });

  it("returns false when trend is not declining", async () => {
    const fetchMoods = vi.fn().mockResolvedValue([0.1, 0.3, 0.2]);
    const write = vi.fn();
    const node = makeCheckEscalation(fetchMoods, write);
    const result = await node(baseState());
    expect(result.needs_escalation).toBe(false);
    expect(write).not.toHaveBeenCalled();
  });

  it("writes an escalation row and flags state when declining", async () => {
    // newest → oldest: -0.7, -0.3, 0.1  (strict decline)
    const fetchMoods = vi.fn().mockResolvedValue([-0.7, -0.3, 0.1]);
    const write = vi.fn().mockResolvedValue(undefined);
    const node = makeCheckEscalation(fetchMoods, write);
    const result = await node(baseState({ severity: 5 }));
    expect(result.needs_escalation).toBe(true);
    expect(write).toHaveBeenCalledOnce();
    const arg = write.mock.calls[0][0];
    expect(arg.userId).toBe(7);
    expect(arg.severity).toBe(5);
    expect(arg.entryId).toBe("entry-123");
    expect(arg.context.trigger).toBe("mood_decline");
    expect(arg.context.last_5_moods).toEqual([-0.7, -0.3, 0.1]);
  });
});
