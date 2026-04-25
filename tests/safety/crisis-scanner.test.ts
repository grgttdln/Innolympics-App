import { describe, expect, it } from "vitest";
import { scanForCrisis } from "@/lib/safety/crisis-scanner";

describe("scanForCrisis", () => {
  describe("benign text", () => {
    it("does not flag empty input", () => {
      expect(scanForCrisis("")).toEqual({ detected: false, keywords: [] });
    });

    it("does not flag a simple happy sentence", () => {
      expect(scanForCrisis("I had a great day at work")).toEqual({
        detected: false,
        keywords: [],
      });
    });

    it("does not flag partial word collisions", () => {
      // "die" is a risky substring but should not match on its own because
      // we never listed bare "die" as a keyword and the scanner uses
      // word-boundary matching.
      expect(scanForCrisis("I changed my diet this week").detected).toBe(false);
      expect(scanForCrisis("The movie was suicidal-ly boring").detected).toBe(
        true,
      ); // "suicidal" substring still matches with \b — acceptable, errs toward safety
    });

    it("does not flag neutral mentions of existing", () => {
      expect(scanForCrisis("ceasefire").detected).toBe(false);
    });
  });

  describe("English direct phrases", () => {
    it.each([
      ["I want to kill myself", ["kill myself"]],
      ["I am thinking about killing myself tonight", ["killing myself"]],
      ["I just want to end it all", ["end it all"]],
      ["I'm going to end my life", ["end my life"]],
      ["suicide is on my mind", ["suicide"]],
      ["I feel suicidal today", ["suicidal"]],
      ["I want to die so badly", ["want to die"]],
      ["I wanna die", ["wanna die"]],
      ["I wish I was dead", ["wish i was dead"]],
      ["I have no reason to live", ["no reason to live"]],
      ["Everyone would be better off dead", ["better off dead"]],
      ["I cut myself last night", ["cut myself"]],
      ["Thoughts of self-harm", ["self-harm"]],
      ["I want to hurt myself", ["hurt myself"]],
      ["overdose is the only way out", ["overdose"]],
    ])("flags: %s", (text, expectedKeywords) => {
      const result = scanForCrisis(text);
      expect(result.detected).toBe(true);
      for (const kw of expectedKeywords) {
        expect(result.keywords).toContain(kw);
      }
    });
  });

  describe("Tagalog phrases", () => {
    it.each([
      ["Papatayin ko sarili ko", ["papatayin ko sarili ko"]],
      [
        "Parang papatayin ko ang sarili ko bukas",
        ["papatayin ko ang sarili ko"],
      ],
      ["Gusto ko nang mamatay", ["gusto ko nang mamatay"]],
      ["gusto ko mamatay", ["gusto ko mamatay"]],
      ["Ayoko na mabuhay", ["ayoko na mabuhay"]],
      ["wala nang kwenta buhay ko", ["wala nang kwenta buhay ko"]],
    ])("flags Tagalog: %s", (text, expectedKeywords) => {
      const result = scanForCrisis(text);
      expect(result.detected).toBe(true);
      for (const kw of expectedKeywords) {
        expect(result.keywords).toContain(kw);
      }
    });
  });

  describe("whitespace tolerance", () => {
    it("matches across extra spaces", () => {
      expect(scanForCrisis("kill   myself").detected).toBe(true);
    });

    it("matches across a line break", () => {
      expect(scanForCrisis("I want to kill\nmyself").detected).toBe(true);
    });

    it("matches across a tab", () => {
      expect(scanForCrisis("kill\tmyself").detected).toBe(true);
    });
  });

  describe("case insensitivity", () => {
    it("matches uppercase", () => {
      expect(scanForCrisis("I WANT TO KILL MYSELF").detected).toBe(true);
    });

    it("matches mixed case", () => {
      expect(scanForCrisis("I Want To KILL myself").detected).toBe(true);
    });

    it("normalizes matched keywords to lowercase", () => {
      const result = scanForCrisis("KILL MYSELF");
      expect(result.keywords).toContain("kill myself");
    });
  });

  describe("multiple keywords", () => {
    it("returns deduplicated matches", () => {
      const result = scanForCrisis("kill myself. kill myself. kill myself.");
      expect(result.detected).toBe(true);
      expect(result.keywords.filter((k) => k === "kill myself")).toHaveLength(1);
    });

    it("returns multiple distinct matches", () => {
      const result = scanForCrisis("I want to die and end my life");
      expect(result.keywords).toEqual(
        expect.arrayContaining(["want to die", "end my life"]),
      );
    });
  });

  describe("punctuation tolerance", () => {
    it("flags even with surrounding punctuation", () => {
      expect(scanForCrisis("(kill myself)").detected).toBe(true);
      expect(scanForCrisis("— kill myself —").detected).toBe(true);
      expect(scanForCrisis("kill myself!!!").detected).toBe(true);
    });
  });

  describe("return shape", () => {
    it("returns the documented shape", () => {
      const result = scanForCrisis("nothing concerning here");
      expect(result).toHaveProperty("detected");
      expect(result).toHaveProperty("keywords");
      expect(Array.isArray(result.keywords)).toBe(true);
    });
  });
});
