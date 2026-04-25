import { describe, expect, it } from "vitest";

import {
  buildGuidedTranscript,
  GUIDED_METHODS,
} from "@/components/guided-methods";

describe("buildGuidedTranscript", () => {
  const prompts = [
    { label: "1 thing I'm grateful for", placeholder: "" },
    { label: "1 thing I accomplished", placeholder: "" },
    { label: "1 thing I'm looking forward to", placeholder: "" },
  ];

  it("joins label and answer for each prompt separated by blank lines", () => {
    const answers = ["morning coffee", "shipped the PR", "dinner with K"];
    expect(buildGuidedTranscript(prompts, answers)).toBe(
      [
        "1 thing I'm grateful for",
        "morning coffee",
        "",
        "1 thing I accomplished",
        "shipped the PR",
        "",
        "1 thing I'm looking forward to",
        "dinner with K",
      ].join("\n"),
    );
  });

  it("trims outer whitespace on each answer", () => {
    const answers = ["  coffee  ", "\n\nthe PR\n", " K "];
    const out = buildGuidedTranscript(prompts, answers);
    expect(out).toContain("\ncoffee\n");
    expect(out).toContain("\nthe PR\n");
    expect(out).toContain("\nK");
    expect(out).not.toContain("  coffee  ");
  });

  it("preserves internal newlines within an answer", () => {
    const answers = ["line one\nline two", "", ""];
    const out = buildGuidedTranscript(prompts, answers);
    expect(out).toContain("line one\nline two");
  });

  it("produces label followed by empty line when answer is blank", () => {
    const answers = ["", "", ""];
    const out = buildGuidedTranscript(prompts, answers);
    expect(out.startsWith("1 thing I'm grateful for\n\n")).toBe(true);
  });
});

describe("GUIDED_METHODS registry", () => {
  it("includes exactly four methods", () => {
    expect(GUIDED_METHODS).toHaveLength(4);
  });

  it("marks 1-1-1 as ready with three prompts", () => {
    const m = GUIDED_METHODS.find((x) => x.key === "one-one-one");
    expect(m?.status).toBe("ready");
    expect(m?.prompts).toHaveLength(3);
  });

  it("marks all other methods as coming-soon", () => {
    const others = GUIDED_METHODS.filter((x) => x.key !== "one-one-one");
    expect(others.every((m) => m.status === "coming-soon")).toBe(true);
  });
});
