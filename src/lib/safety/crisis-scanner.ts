import { CRISIS_KEYWORDS } from "./crisis-keywords";

export interface CrisisScanResult {
  detected: boolean;
  keywords: string[];
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Build a single combined regex where:
 *   - alternatives are the escaped keywords
 *   - runs of internal whitespace are turned into `\s+` so multi-word
 *     phrases survive odd spacing / newlines / tabs
 *   - each alternative is wrapped with a lookaround so we still require
 *     a word/edge boundary on the outer ends, but allow internal hyphens
 *     ("self-harm") to match as-written
 *
 * Sorted longest-first so "killing myself" wins over "kill myself".
 */
const PATTERN = (() => {
  const alternatives = [...CRISIS_KEYWORDS]
    .sort((a, b) => b.length - a.length)
    .map((kw) => {
      const flexWhitespace = kw
        .split(/\s+/)
        .map(escapeRegex)
        .join("\\s+");
      return `(?:${flexWhitespace})`;
    });
  return new RegExp(
    `(?<![A-Za-z0-9_])(?:${alternatives.join("|")})(?![A-Za-z0-9_])`,
    "gi",
  );
})();

/**
 * Pure, synchronous, <10ms on any reasonable journal entry. Safe to import
 * into React components. Never throws — on any unexpected error it
 * fails-safe by reporting `detected: true`.
 */
export function scanForCrisis(text: string): CrisisScanResult {
  if (!text) return { detected: false, keywords: [] };

  try {
    const matches = text.match(PATTERN);
    if (!matches || matches.length === 0) {
      return { detected: false, keywords: [] };
    }
    const normalized = new Set(
      matches.map((m) => m.toLowerCase().replace(/\s+/g, " ").trim()),
    );
    return { detected: true, keywords: [...normalized] };
  } catch {
    return { detected: true, keywords: [] };
  }
}
