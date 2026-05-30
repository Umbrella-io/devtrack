"use client";

import { useEffect, useState } from "react";

interface StreakData {
  current: number;
  longest: number;
  lastCommitDate: string | null;
  totalActiveDays: number;
}

interface ContributionData {
  days: number;
  total: number;
  data: Record<string, number>;
}

export default function StreakTracker() {
  const [data, setData] = useState<StreakData | null>(null);
  const [contributionData, setContributionData] = useState<ContributionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const fetchStreak = async () => {
    setLoading(true);
    setError(null);

    try {
      const [streakRes, contributionRes] = await Promise.all([
        fetch("/api/metrics/streak"),
        fetch("/api/metrics/contributions?days=365"),
      ]);

      if (!streakRes.ok || !contributionRes.ok) {
        throw new Error("Failed to fetch data");
      }

      const streakData = (await streakRes.json()) as StreakData;
      const contribData = (await contributionRes.json()) as ContributionData;

      setData(streakData);
      setContributionData(contribData);
    } catch {
      setError(
        "We couldn't load your streak data right now. Please try again in a moment."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStreak();
  }, []);

  if (loading) {
    return (
      <div
        className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6"
        role="status"
        aria-label="Loading commit streaks"
      >
        <div className="mb-4 h-5 w-36 rounded bg-[var(--card-muted)] animate-pulse" />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 rounded-lg bg-[var(--card-muted)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-[var(--card-foreground)]">
          Commit Streaks
        </h2>
        <div
          role="alert"
          className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400"
        >
          <p>{error}</p>
          <button
            type="button"
            onClick={fetchStreak}
            aria-label="Retry loading streak data"
            className="mt-3 rounded-md border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/10"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const stats = data
    ? [
        {
          label: "Current Streak",
          value: data.current,
          unit: "days",
          highlight: data.current > 0,
          icon: "🔥",
          description: `Current streak: ${data.current} consecutive coding days`,
        },
        {
          label: "Longest Streak",
          value: data.longest,
          unit: "days",
          highlight: false,
          icon: "🏆",
          description: `Longest streak ever: ${data.longest} days`,
        },
        {
          label: "Active Days (90d)",
          value: data.totalActiveDays,
          unit: "days",
          highlight: false,
          icon: "📅",
          description: `${data.totalActiveDays} active days in the last 90 days`,
        },
        {
          label: "Last Commit",
          value: data.lastCommitDate
            ? new Date(data.lastCommitDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
            : "—",
          unit: "",
          highlight: false,
          icon: "⚡",
          description: data.lastCommitDate
            ? `Last commit on ${new Date(data.lastCommitDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`
            : "No commits recorded",
        },
      ]
    : [];

  return (
    <section
      aria-labelledby="commit-streaks-heading"
      className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm"
    >
      <h2
        id="commit-streaks-heading"
        className="mb-4 text-lg font-semibold text-[var(--card-foreground)]"
      >
        Commit Streaks
      </h2>

      <dl className="grid grid-cols-2 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`rounded-lg p-4 text-center ${
              stat.highlight
                ? "border border-[var(--accent)]/40 bg-[var(--accent-soft)]"
                : "bg-[var(--control)]"
            }`}
          >
            <span aria-hidden="true" className="text-xl mb-1 block">
              {stat.icon}
            </span>
            <dd
              className="text-2xl font-bold text-[var(--accent)]"
              aria-label={stat.description}
            >
              {stat.value}
              {stat.unit && (
                <span className="ml-1 text-sm font-normal text-[var(--muted-foreground)]">
                  {stat.unit}
                </span>
              )}
            </dd>
            <dt className="mt-1 text-xs text-[var(--muted-foreground)]">
              {stat.label}
            </dt>
          </div>
        ))}
      </dl>

      {loading ? (
        <div className="mt-6 pt-6 border-t border-[var(--border)]">
          <div className="mb-4 h-6 w-40 rounded bg-[var(--card-muted)] animate-pulse" />
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square rounded-lg bg-[var(--card-muted)] animate-pulse"
              />
            ))}
          </div>
        </div>
      ) : contributionData ? (
        <StreakCalendar
          contributions={contributionData.data}
          currentMonth={calendarMonth}
          onMonthChange={setCalendarMonth}
        />
      ) : null}
    </section>
  );
}

interface StreakCalendarProps {
  contributions: Record<string, number>;
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
}

function StreakCalendar({
  contributions,
  currentMonth,
  onMonthChange,
}: StreakCalendarProps) {
  const today = new Date();
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  const monthName = firstDay.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const calendarDays: Array<{ date: Date | null; dayOfMonth: number | null }> = [];

  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push({ date: null, dayOfMonth: null });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push({ date: new Date(year, month, day), dayOfMonth: day });
  }

  const totalCells = Math.ceil(calendarDays.length / 7) * 7;
  while (calendarDays.length < totalCells) {
    calendarDays.push({ date: null, dayOfMonth: null });
  }

  const handlePrevMonth = () => {
    onMonthChange(new Date(year, month - 1));
  };

  const handleNextMonth = () => {
    onMonthChange(new Date(year, month + 1));
  };

  // Build accessible summary for screen readers
  const committedDays = calendarDays.filter(({ date }) => {
    if (!date || date > today) return false;
    const dateStr = date.toISOString().slice(0, 10);
    return (contributions[dateStr] ?? 0) > 0;
  }).length;

  return (
    <div className="mt-6 pt-6 border-t border-[var(--border)]">
      {/* Calendar header */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--card-foreground)]">
          {monthName}
        </h3>
        <div className="flex gap-2" role="group" aria-label="Calendar navigation">
          <button
            onClick={handlePrevMonth}
            aria-label={`Previous month`}
            className="rounded-md p-1 hover:bg-[var(--control)] transition-colors"
          >
            <span aria-hidden="true">←</span>
          </button>
          <button
            onClick={handleNextMonth}
            aria-label={`Next month`}
            className="rounded-md p-1 hover:bg-[var(--control)] transition-colors"
          >
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>

      {/* Screen-reader summary */}
      <p className="sr-only">
        {monthName}: {committedDays} days with commits.
      </p>

      {/* Day-of-week labels */}
      <div className="mb-2 grid grid-cols-7 gap-1" aria-hidden="true">
        {dayLabels.map((label) => (
          <div
            key={label}
            className="text-center text-xs font-medium text-[var(--muted-foreground)]"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div
        className="grid grid-cols-7 gap-1"
        role="grid"
        aria-label={`Commit calendar for ${monthName}`}
      >
        {/* Empty leading cells */}
        {Array.from({ length: startingDayOfWeek }).map((_, i) => (
          <div key={`empty-start-${i}`} role="gridcell" aria-hidden="true" className="aspect-square" />
        ))}

        {calendarDays
          .filter((d) => d.date !== null)
          .map((dayData) => {
            const date = dayData.date!;
            const dateStr = date.toISOString().slice(0, 10);
            const commitCount = contributions[dateStr] ?? 0;
            const isFuture = date > today;
            const isToday = date.toDateString() === today.toDateString();

            let bgColor = "bg-white dark:bg-transparent";
            let borderColor = "border border-[var(--border)]";

            if (!isFuture) {
              if (commitCount > 0) {
                bgColor = "bg-green-500";
                borderColor = "border border-green-600";
              } else {
                bgColor = "bg-gray-500";
                borderColor = "border border-gray-600";
              }
            }

            const humanDate = date.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            });

            const cellLabel = isFuture
              ? `${humanDate}: future date`
              : commitCount > 0
              ? `${humanDate}: ${commitCount} commit${commitCount !== 1 ? "s" : ""}`
              : `${humanDate}: no commits`;

            return (
              <div
                key={dateStr}
                role="gridcell"
                aria-label={cellLabel}
                aria-current={isToday ? "date" : undefined}
                className={`group relative aspect-square rounded-md ${bgColor} ${borderColor} transition-transform hover:scale-110 cursor-default ${
                  isToday ? "ring-2 ring-[var(--accent)]" : ""
                }`}
              >
                {!isFuture && (
                  <span
                    className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white dark:text-gray-900 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-hidden="true"
                  >
                    {dayData.dayOfMonth}
                  </span>
                )}

                {/* Visual tooltip (decorative) */}
                {!isFuture && (
                  <div
                    className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-[var(--foreground)] px-2 py-1 text-xs text-[var(--background)] opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-10"
                    aria-hidden="true"
                  >
                    {commitCount > 0 ? `${commitCount} commit${commitCount !== 1 ? "s" : ""}` : "No commits"}
                    <div className="absolute top-full left-1/2 h-1 w-1 -translate-x-1/2 border-4 border-t-[var(--foreground)] border-transparent" />
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {/* Legend */}
      <div
        className="mt-4 flex flex-wrap gap-4 text-xs text-[var(--muted-foreground)]"
        aria-label="Calendar legend"
      >
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-green-500" aria-hidden="true" />
          <span>Committed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-gray-500" aria-hidden="true" />
          <span>No commits</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded border border-[var(--border)]" aria-hidden="true" />
          <span>Future</span>
        </div>
      </div>
    </div>
  );
}