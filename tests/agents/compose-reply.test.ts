import { describe, expect, it } from "vitest";
import { stripMarkdown } from "@/lib/agents/nodes/compose-reply";

describe("stripMarkdown", () => {
  it("leaves plain prose untouched", () => {
    const input = "That sounds hard. Take a breath.";
    expect(stripMarkdown(input)).toBe(input);
  });

  it("strips bold markers", () => {
    expect(stripMarkdown("This is **very important** today")).toBe(
      "This is very important today",
    );
    expect(stripMarkdown("__loud__ word")).toBe("loud word");
  });

  it("strips italic markers", () => {
    expect(stripMarkdown("This is *gentle* wisdom")).toBe(
      "This is gentle wisdom",
    );
    expect(stripMarkdown("I feel _so tired_ today")).toBe(
      "I feel so tired today",
    );
  });

  it("strips asterisk-prefix bullet lists", () => {
    const input = [
      "Try this:",
      "*   Look around.",
      "*   Feel the chair.",
      "*   Hear three sounds.",
    ].join("\n");
    const expected = [
      "Try this:",
      "Look around.",
      "Feel the chair.",
      "Hear three sounds.",
    ].join("\n");
    expect(stripMarkdown(input)).toBe(expected);
  });

  it("strips dash-prefix bullet lists", () => {
    const input = "- one\n- two\n- three";
    expect(stripMarkdown(input)).toBe("one\ntwo\nthree");
  });

  it("strips numbered list prefixes", () => {
    expect(stripMarkdown("1. Breathe in\n2. Hold\n3. Breathe out")).toBe(
      "Breathe in\nHold\nBreathe out",
    );
  });

  it("strips heading markers", () => {
    expect(stripMarkdown("## A section\nbody")).toBe("A section\nbody");
    expect(stripMarkdown("### smaller heading")).toBe("smaller heading");
  });

  it("strips inline code backticks", () => {
    expect(stripMarkdown("Try the `box breathing` technique")).toBe(
      "Try the box breathing technique",
    );
  });

  it("preserves paragraph breaks", () => {
    const input = "First paragraph.\n\nSecond paragraph.";
    expect(stripMarkdown(input)).toBe(input);
  });

  it("collapses 3+ newline runs to 2", () => {
    expect(stripMarkdown("a\n\n\n\nb")).toBe("a\n\nb");
  });

  it("does not eat asterisks used inside a larger token", () => {
    // "5 things" should not be touched (no bold markers around it)
    expect(stripMarkdown("name 5 things you can see")).toBe(
      "name 5 things you can see",
    );
  });

  it("handles the observed distress-mode output shape", () => {
    const input = [
      "When your mind is racing:",
      "",
      "*   **5:** Look around you and name five things you can see.",
      "*   **4:** Name four things you can physically feel.",
      "*   **3:** Listen for three distinct sounds.",
    ].join("\n");
    const result = stripMarkdown(input);
    expect(result).not.toMatch(/\*/);
    expect(result).toContain("5: Look around");
    expect(result).toContain("4: Name four");
  });
});
