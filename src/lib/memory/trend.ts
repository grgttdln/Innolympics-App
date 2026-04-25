/**
 * Pure utility — no DB dependency so it's safe to import from tests and
 * the browser.
 *
 * Returns true when the most recent entries form a strictly monotonic
 * decline of length >= 3. Operates on scores in newest-first order so it
 * must compare neighbours in reverse.
 */
export function isDecliningTrend(moodScoresNewestFirst: number[]): boolean {
  if (moodScoresNewestFirst.length < 3) return false;
  const oldestFirst = [...moodScoresNewestFirst].reverse();
  for (let i = 1; i < oldestFirst.length; i++) {
    if (oldestFirst[i] >= oldestFirst[i - 1]) return false;
  }
  return true;
}
