/**
 * Client-side pattern detector that powers the "Tala noticed" card on
 * the profile page. Pure function over the entries the page already
 * fetches — no network, no DB.
 *
 * Rule: fire when ≥2 of the last 5 entries have intent "distress" or
 * "crisis". The card shows the (up to 3) most recent contributing
 * entries as evidence.
 */

type HeavyEntry = {
  id: string;
  date: string;
  intent: string;
};

export type TalaInsight = {
  kind: "heavy-pattern";
  contributingEntries: HeavyEntry[];
};

const HEAVY_INTENTS = new Set(["distress", "crisis"]);
const WINDOW_SIZE = 5;
const MIN_HEAVY = 2;
const MAX_EVIDENCE = 3;

export function detectTalaInsight<
  T extends { id: string; date: string; intent: string },
>(entries: readonly T[]): TalaInsight | null {
  if (entries.length === 0) return null;

  const window = entries.slice(0, WINDOW_SIZE);
  const heavy = window.filter((e) => HEAVY_INTENTS.has(e.intent));
  if (heavy.length < MIN_HEAVY) return null;

  return {
    kind: "heavy-pattern",
    contributingEntries: heavy.slice(0, MAX_EVIDENCE).map((e) => ({
      id: e.id,
      date: e.date,
      intent: e.intent,
    })),
  };
}
