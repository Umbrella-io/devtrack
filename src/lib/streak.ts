import { dateDiffDays, toDateStr } from "@/lib/dateUtils";

export interface StreakResult {
  current: number;
  longest: number;
  lastCommitDate: string | null;
  totalActiveDays: number;
  freezeDates: string[];
}

export interface DateStreakResult {
  currentStreak: number;
  longestStreak: number;
}

function todayAndYesterday(timeZone: string): {
  today: string;
  yesterday: string;
} {
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
 * Freeze dates count as active days so they do not break the streak.
 * The streak is alive when the last active day is today or yesterday.
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
  const commitDays = Array.from(combinedDates).sort();

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

  for (let i = 1; i < commitDays.length; i += 1) {
    const diff = dateDiffDays(commitDays[i - 1], commitDays[i]);

    if (diff === 1) {
      currentRun += 1;
      longestStreak = Math.max(longestStreak, currentRun);
      continue;
    }

    runs.push({
      start: runStart,
      end: commitDays[i - 1],
      length: currentRun,
    });
    runStart = commitDays[i];
    currentRun = 1;
  }

  runs.push({
    start: runStart,
    end: commitDays[commitDays.length - 1],
    length: currentRun,
  });

  const { today, yesterday } = todayAndYesterday(timeZone);
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

// Adapter for callers that pass Date objects.
export function calculateStreak(commitDates: Date[]): DateStreakResult {
  const dateSet = new Set(commitDates.map((d) => toDateStr(d)));
  const result = calculateStreakFromDates(dateSet);
  return { currentStreak: result.current, longestStreak: result.longest };
}
