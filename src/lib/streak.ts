import {
  calculateCurrentStreak,
  calculateLongestStreak,
} from "@/lib/streak-utils";

export interface StreakResult {
  currentStreak: number;
  longestStreak: number;
}

/**
 * Calculates current and longest streak from a list of commit dates.
 *
 * Notes:
 * - Dates are deduplicated by UTC calendar day (YYYY-MM-DD).
 * - A streak is considered "current" if the last active day is today or yesterday (UTC).
 */
export function calculateStreak(commitDates: Date[]): StreakResult {
  return {
    currentStreak: calculateCurrentStreak(commitDates),
    longestStreak: calculateLongestStreak(commitDates),
  };
}
