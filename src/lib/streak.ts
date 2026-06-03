import { dateDiffDays, toDateStr } from "@/lib/dateUtils";

export interface StreakResult {
  current: number;
  longest: number;
  lastCommitDate: string | null;
  totalActiveDays: number;
  freezeDates: string[];
}

function todayAndYesterday(timeZone: string): { today: string; yesterday: string } {
  if (timeZone === "UTC") {
    const today = toDateStr(new Date());
    const yesterday = toDateStr(new Date(Date.now() - 86400000));
    return { today, yesterday };
  }

  const fmt = new Intl.DateTimeFormat("en", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = (d: Date) => {
    const p = fmt.formatToParts(d);
    const y = p.find((x) => x.type === "year")?.value ?? "0000";
    const m = p.find((x) => x.type === "month")?.value ?? "00";
    const day = p.find((x) => x.type === "day")?.value ?? "00";
    return `${y}-${m}-${day}`;
  };

  return {
    today: parts(new Date()),
    yesterday: parts(new Date(Date.now() - 86400000)),
  };
}

/**
 * Canonical streak calculation shared across all endpoints.
 * freeze dates count as active days so they don't break the streak.
 * The streak is alive when the last active day is today or yesterday —
 * the yesterday grace window prevents a reset before the user's first
 * commit of the new calendar day.
 */
export function calculateStreakFromDates(
  activeDates: Set<string>,
  freezeDates: Set<string> = new Set(),
  timeZone = "UTC"
): StreakResult {
  const combinedDates = new Set<string>([
    ...Array.from(activeDates),
    ...Array.from(freezeDates),
  ]);
  const commitDays = Array.from(combinedDates).sort(); // ascending "YYYY-MM-DD"

  if (commitDays.length === 0) {
    return {
      current: 0,
      longest: 0,
      lastCommitDate: null,
      totalActiveDays: 0,
      freezeDates: Array.from(freezeDates),
    };
  }

  let longestStreak = 1;
  let currentRun = 1;
  const runs: { start: string; end: string; length: number }[] = [];
  let runStart = commitDays[0];

  // Walk the sorted date list and split into consecutive runs.
  // dateDiffDays returns 1 for adjacent calendar days — any gap > 1 breaks the streak.
  for (let i = 1; i < commitDays.length; i++) {
    const diff = dateDiffDays(commitDays[i - 1], commitDays[i]);
    if (diff === 1) {
      // Consecutive day — extend the current run.
      currentRun++;
      if (currentRun > longestStreak) longestStreak = currentRun;
    } else {
      // Gap detected — close the current run and start a new one.
      runs.push({ start: runStart, end: commitDays[i - 1], length: currentRun });
      runStart = commitDays[i];
      currentRun = 1;
    }
  }
  // Push the final run.
  runs.push({ start: runStart, end: commitDays[commitDays.length - 1], length: currentRun });

  const { today, yesterday } = todayAndYesterday(timeZone);

  // Current streak is alive if the last active day is today OR yesterday.
  const lastRun = runs[runs.length - 1];
  const currentStreak =
    lastRun.end === today || lastRun.end === yesterday ? lastRun.length : 0;

  return {
    current: currentStreak,
    longest: longestStreak,
    lastCommitDate: commitDays[commitDays.length - 1],
    totalActiveDays: commitDays.length,
    freezeDates: Array.from(freezeDates),
  };
}

// Lightweight wrapper for callers that only need the current streak number.
// Accepts raw ISO timestamp strings or pre-deduplicated YYYY-MM-DD strings.
export function calculateCurrentStreak(dates: Set<string> | string[]): number {
  const dateSet = Array.isArray(dates)
    ? new Set(dates.map((d) => d.slice(0, 10)))
    : dates;
  return calculateStreakFromDates(dateSet).current;
}

// Adapter for callers that pass Date objects and expect {currentStreak, longestStreak}.
export function calculateStreak(
  commitDates: Date[]
): { currentStreak: number; longestStreak: number } {
  const dateSet = new Set(commitDates.map((d) => toDateStr(d)));
  const result = calculateStreakFromDates(dateSet);
  return { currentStreak: result.current, longestStreak: result.longest };
}
