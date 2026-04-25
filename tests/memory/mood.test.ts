import { describe, expect, it } from "vitest";
import { isDecliningTrend } from "@/lib/memory/trend";

describe("isDecliningTrend", () => {
  describe("guards", () => {
    it("returns false for empty input", () => {
      expect(isDecliningTrend([])).toBe(false);
    });

    it("returns false for fewer than 3 scores", () => {
      expect(isDecliningTrend([0.5])).toBe(false);
      expect(isDecliningTrend([-0.8, -0.3])).toBe(false);
    });
  });

  describe("strict monotonic decline (rule A)", () => {
    it("detects a 3-step strict decline (newest first)", () => {
      // oldest → newest: 0.1, -0.3, -0.7 → strictly descending
      expect(isDecliningTrend([-0.7, -0.3, 0.1])).toBe(true);
    });

    it("detects longer strict decline", () => {
      expect(isDecliningTrend([-0.6, -0.3, 0.0, 0.2, 0.5])).toBe(true);
    });

    it("rejects a flat segment across the whole window", () => {
      // latest not low enough to hit condition (b) either
      expect(isDecliningTrend([-0.3, -0.3, -0.3])).toBe(false);
    });
  });

  describe("plateau then crash (rule B)", () => {
    it("fires when baseline was mild low and latest crashes", () => {
      // earlier avg = -0.4. latest = -0.8. drop = 0.4 (>= 0.2), latest <= -0.5.
      expect(isDecliningTrend([-0.8, -0.4, -0.4, -0.4, -0.4])).toBe(true);
    });

    it("fires on the realistic 6-entry case we observed in production", () => {
      // user 3 trajectory after the first plateau-then-crash attempt:
      // classifier kept landing on -0.7 flat. We want the *next* real
      // crash (-0.85) to fire.
      expect(isDecliningTrend([-0.85, -0.7, -0.7, -0.4, -0.4])).toBe(true);
    });

    it("does NOT fire if latest is only slightly lower than baseline", () => {
      // earlier avg = -0.4. latest = -0.5. drop = 0.1. below threshold.
      expect(isDecliningTrend([-0.5, -0.4, -0.4, -0.4])).toBe(false);
    });

    it("does NOT fire if latest is low but baseline was already low too", () => {
      // earlier avg = -0.75. latest = -0.8. drop = 0.05.
      expect(isDecliningTrend([-0.8, -0.7, -0.8, -0.7, -0.8])).toBe(false);
    });

    it("does NOT fire if latest is not low enough even after a big drop", () => {
      // earlier avg = +0.5. latest = -0.3. drop = 0.8, but latest > -0.5.
      // And earlier values are mixed (0.6, 0.3, 0.6) so no strict decline.
      // One bad day after a happy stretch is not a decline pattern.
      expect(isDecliningTrend([-0.3, 0.6, 0.3, 0.6])).toBe(false);
    });
  });

  describe("original monotonic edge cases still work", () => {
    it("rejects when a single step goes up mid-window (and latest isn't low enough for B)", () => {
      // latest = -0.2 → not <= -0.5, so B does not rescue it.
      expect(isDecliningTrend([-0.2, -0.5, 0.0])).toBe(false);
    });

    it("rejects a single flat pair within longer sequence (and latest isn't low enough)", () => {
      // latest = -0.3 → not <= -0.5.
      expect(isDecliningTrend([-0.3, -0.2, 0.2, 0.2, 0.5])).toBe(false);
    });
  });
});
