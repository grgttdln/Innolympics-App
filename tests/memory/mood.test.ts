import { describe, expect, it } from "vitest";
import { isDecliningTrend } from "@/lib/memory/trend";

describe("isDecliningTrend", () => {
  it("returns false for empty input", () => {
    expect(isDecliningTrend([])).toBe(false);
  });

  it("returns false for fewer than 3 scores", () => {
    expect(isDecliningTrend([0.5])).toBe(false);
    expect(isDecliningTrend([0.5, 0.1])).toBe(false);
  });

  it("detects a strict decline (newest first)", () => {
    // newest first: -0.7, -0.3, 0.1  →  oldest first: 0.1, -0.3, -0.7 → declining
    expect(isDecliningTrend([-0.7, -0.3, 0.1])).toBe(true);
  });

  it("rejects a flat segment", () => {
    // newest first: -0.3, -0.3, 0.1  →  oldest first: 0.1, -0.3, -0.3 — not strict
    expect(isDecliningTrend([-0.3, -0.3, 0.1])).toBe(false);
  });

  it("rejects when any step goes up", () => {
    // newest first: -0.2, -0.5, 0.0  → oldest first: 0, -0.5, -0.2 — goes up then down
    expect(isDecliningTrend([-0.2, -0.5, 0.0])).toBe(false);
  });

  it("detects longer strictly declining sequences", () => {
    // oldest→newest: 0.5, 0.2, 0.0, -0.3, -0.6  (all strict)
    expect(isDecliningTrend([-0.6, -0.3, 0.0, 0.2, 0.5])).toBe(true);
  });

  it("rejects a single flat pair within a longer run", () => {
    // oldest→newest: 0.5, 0.2, 0.2, -0.3, -0.6
    expect(isDecliningTrend([-0.6, -0.3, 0.2, 0.2, 0.5])).toBe(false);
  });
});
