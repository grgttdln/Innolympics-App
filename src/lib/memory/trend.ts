/**
 * Pure utility — no DB dependency so it's safe to import from tests and
 * the browser.
 *
 * Decides whether a user's recent mood history warrants an escalation
 * signal. The original rule was "3+ strictly descending scores"; that
 * fails on real-world data where moods plateau and then crash.
 *
 * A decline now fires when EITHER:
 *   (a) the last 3+ scores are strictly decreasing, OR
 *   (b) the latest score is meaningfully worse than the earlier
 *       baseline — captured as "most recent mood is both clearly low
 *       (<= -0.5) and at least 0.2 lower than the average of the
 *       preceding entries in the window".
 *
 * Both conditions are conservative enough to avoid false positives on
 * a single bad day after a neutral stretch, but loose enough to catch
 * the plateau-then-crash pattern that the strict rule missed.
 */
export function isDecliningTrend(moodScoresNewestFirst: number[]): boolean {
  if (moodScoresNewestFirst.length < 3) return false;

  // Condition (a): strict monotonic decline across the whole window.
  // Walk oldest → newest; if every step goes down, it's declining.
  const oldestFirst = [...moodScoresNewestFirst].reverse();
  let strictDecline = true;
  for (let i = 1; i < oldestFirst.length; i++) {
    if (oldestFirst[i] >= oldestFirst[i - 1]) {
      strictDecline = false;
      break;
    }
  }
  if (strictDecline) return true;

  // Condition (b): plateau-then-crash — latest is clearly low AND
  // significantly below the average of the other scores in the window.
  const [latest, ...earlier] = moodScoresNewestFirst;
  if (earlier.length < 2) return false;
  const avgEarlier = earlier.reduce((a, b) => a + b, 0) / earlier.length;

  const latestIsLow = latest <= -0.5;
  const dropFromAverage = avgEarlier - latest;
  const droppedMeaningfully = dropFromAverage >= 0.2;

  return latestIsLow && droppedMeaningfully;
}
