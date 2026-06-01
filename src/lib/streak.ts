import { dateDiffDays, toDateStr } from "@/lib/dateUtils";

export interface StreakResult {
  currentStreak: number;
  longestStreak: number;
}

function toUtcDayKey(date: Date): string | null {
  if (!(date instanceof Date)) return null;
  if (Number.isNaN(date.getTime())) return null;
  return toDateStr(date);
}

/**
 * Calculates current and longest streak from a list of commit dates.
 *
 * Notes:
 * - Dates are deduplicated by UTC calendar day (YYYY-MM-DD).
 * - A streak is considered "current" if the last active day is today or yesterday (UTC).
 */
export function calculateStreak(commitDates: Date[]): StreakResult {
  const dayKeys = new Set<string>();
  for (const d of commitDates) {
    const key = toUtcDayKey(d);
    if (key) dayKeys.add(key);
  }

  const days = Array.from(dayKeys).sort();
  if (days.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  let longestStreak = 1;
  let currentRun = 1;
  const runs: { end: string; length: number }[] = [];

  for (let i = 1; i < days.length; i += 1) {
    const diff = dateDiffDays(days[i - 1], days[i]);
    if (diff === 1) {
      currentRun += 1;
      longestStreak = Math.max(longestStreak, currentRun);
      continue;
    }
    runs.push({ end: days[i - 1], length: currentRun });
    currentRun = 1;
  }
  runs.push({ end: days[days.length - 1], length: currentRun });

  const today = toDateStr(new Date());
  const yesterday = toDateStr(new Date(Date.now() - 86400000));
  const lastRun = runs[runs.length - 1];

  return {
    currentStreak:
      lastRun.end === today || lastRun.end === yesterday ? lastRun.length : 0,
    longestStreak,
  };
}

