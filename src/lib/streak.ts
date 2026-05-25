import { dateDiffDays, toDateStr } from "@/lib/dateUtils";

export type StreakData = {
  current: number;
  longest: number;
  lastCommitDate: string | null;
  totalActiveDays: number;
  freezeDates: string[];
};

export function toContributionDate(value: string | Date): string {
  if (value instanceof Date) {
    return toDateStr(value);
  }

  const datePart = value.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (datePart) {
    return datePart;
  }

  return toDateStr(new Date(value));
}

export function calculateStreakFromDates(
  activeDates: Iterable<string>,
  freezeDates: Iterable<string> | undefined = [],
  now: Date = new Date()
): StreakData {
  const frozenDays = Array.from(new Set(Array.from(freezeDates).map(toContributionDate)));
  const combinedDates = new Set<string>([
    ...Array.from(activeDates).map(toContributionDate),
    ...frozenDays,
  ]);
  const commitDays = Array.from(combinedDates).sort();

  if (commitDays.length === 0) {
    return {
      current: 0,
      longest: 0,
      lastCommitDate: null,
      totalActiveDays: 0,
      freezeDates: frozenDays,
    };
  }

  let longestStreak = 1;
  let currentRun = 1;
  const runs: { start: string; end: string; length: number }[] = [];
  let runStart = commitDays[0];

  for (let i = 1; i < commitDays.length; i++) {
    const diff = dateDiffDays(commitDays[i - 1], commitDays[i]);
    if (diff === 1) {
      currentRun++;
      if (currentRun > longestStreak) {
        longestStreak = currentRun;
      }
    } else {
      runs.push({ start: runStart, end: commitDays[i - 1], length: currentRun });
      runStart = commitDays[i];
      currentRun = 1;
    }
  }
  runs.push({
    start: runStart,
    end: commitDays[commitDays.length - 1],
    length: currentRun,
  });

  const lastDay = commitDays[commitDays.length - 1];
  const today = toDateStr(now);
  const yesterday = toDateStr(new Date(now.getTime() - 86400000));

  const lastRun = runs[runs.length - 1];
  const currentStreak =
    lastRun.end === today || lastRun.end === yesterday ? lastRun.length : 0;

  return {
    current: currentStreak,
    longest: longestStreak,
    lastCommitDate: lastDay,
    totalActiveDays: commitDays.length,
    freezeDates: frozenDays,
  };
}

export function isStreakAtRisk(
  streak: Pick<StreakData, "current" | "lastCommitDate">,
  options: { hasStreakFreeze?: boolean; now?: Date } = {}
): boolean {
  if (streak.current <= 0 || options.hasStreakFreeze) {
    return false;
  }

  return streak.lastCommitDate !== toDateStr(options.now ?? new Date());
}
