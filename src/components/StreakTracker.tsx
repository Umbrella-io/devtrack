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

interface FreezeData {
  hasFreeze: boolean;
}

export default function StreakTracker() {
  const [data, setData] = useState<StreakData | null>(null);
  const [contributionData, setContributionData] = useState<ContributionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [freeze, setFreeze] = useState<FreezeData | null>(null);
  const [freezeLoading, setFreezeLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

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
      setError("We couldn't load your streak data right now. Please try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  const fetchFreeze = () => {
    setFreezeLoading(true);
    fetch("/api/streak/freeze")
      .then((r) => r.json())
      .then((d: FreezeData) => setFreeze(d))
      .catch(() => setFreeze(null))
      .finally(() => setFreezeLoading(false));
  };

  useEffect(() => {
    fetchStreak();
    fetchFreeze();
  }, []);

  async function handleCancelFreeze() {
    if (!confirmCancel) {
      setConfirmCancel(true);
      return;
    }

    setCancelling(true);
    try {
      const res = await fetch("/api/streak/freeze", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to cancel freeze");

      setConfirmCancel(false);

      const [streakRes, freezeRes] = await Promise.all([
        fetch("/api/metrics/streak"),
        fetch("/api/streak/freeze"),
      ]);
      const [streakData, freezeData] = await Promise.all([
        streakRes.json() as Promise<StreakData>,
        freezeRes.json() as Promise<FreezeData>,
      ]);
      setData(streakData);
      setFreeze(freezeData);
    } catch {
      fetchFreeze();
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-[var(--card)] rounded-xl p-6">
        <div className="h-6 w-36 bg-[var(--card-muted)] rounded animate-pulse mb-4" />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-[var(--card-muted)] rounded-lg h-28 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-[var(--card-foreground)]">Commit Streaks</h2>
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          <p>{error}</p>
          <button
            type="button"
            onClick={fetchStreak}
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
          tooltip: "Current consecutive coding days",
        },
        {
          label: "Longest Streak",
          value: data.longest,
          unit: "days",
          highlight: false,
          icon: "🏆",
          tooltip: "Your longest streak ever",
        },
        {
          label: "Active Days (90d)",
          value: data.totalActiveDays,
          unit: "days",
          highlight: false,
          icon: "📅",
          tooltip: "Days you made commits in the last 90 days",
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
          tooltip: "Your most recent commit",
        },
      ]
    : [];

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-[var(--card-foreground)]">Commit Streaks</h2>
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`rounded-lg p-4 text-center ${
              stat.highlight
                ? "border border-[var(--accent)]/40 bg-[var(--accent-soft)]"
                : "bg-[var(--control)]"
            }`}
          >
            <div className="text-xl mb-1" title={stat.tooltip} aria-label={stat.tooltip} role="img">{stat.icon}</div>
            <div
              className={`text-2xl font-bold ${
                stat.highlight ? "text-[var(--accent)]" : "text-[var(--accent)]"
              }`}
            >
              {stat.value}
              {stat.unit && (
                <span className="ml-1 text-sm font-normal text-[var(--muted-foreground)]">
                  {stat.unit}
                </span>
              )}
            </div>
            <div className="mt-1 text-xs text-[var(--muted-foreground)]">{stat.label}</div>
          </div>
        ))}
      </div>

      {!freezeLoading && freeze?.hasFreeze && (
        <div className="mt-4 flex items-center justify-between rounded-lg border border-[var(--accent)]/30 bg-[var(--accent-soft)] px-4 py-3">
          <span className="text-sm font-medium text-[var(--accent)]">✓ Freeze active today</span>
          {confirmCancel ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--muted-foreground)]">Remove freeze?</span>
              <button
                type="button"
                onClick={handleCancelFreeze}
                disabled={cancelling}
                className="rounded-md bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400 transition hover:bg-red-500/20 disabled:opacity-60"
              >
                {cancelling ? "Removing..." : "Yes, remove"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmCancel(false)}
                disabled={cancelling}
                className="rounded-md border border-[var(--border)] px-2.5 py-1 text-xs font-medium text-[var(--muted-foreground)] transition hover:bg-[var(--control)]"
              >
                Keep
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleCancelFreeze}
              className="rounded-md border border-[var(--border)] px-3 py-1 text-xs font-medium text-[var(--muted-foreground)] transition hover:bg-[var(--control)]"
            >
              Cancel freeze
            </button>
          )}
        </div>
      )}

      {/* Streak Calendar Section */}
      {contributionData ? (
        <StreakCalendar
          contributions={contributionData.data}
          currentMonth={calendarMonth}
          onMonthChange={setCalendarMonth}
        />
      ) : null}
    </div>
  );
}

interface StreakCalendarProps {
  contributions: Record<string, number>;
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
}

function StreakCalendar({ contributions, currentMonth, onMonthChange }: StreakCalendarProps) {
  const today = new Date();
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  const monthName = firstDay.toLocaleDateString("en-US", { month: "long", year: "numeric" });
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

  const handlePrevMonth = () => onMonthChange(new Date(year, month - 1));
  const handleNextMonth = () => onMonthChange(new Date(year, month + 1));

  return (
    <div className="mt-6 pt-6 border-t border-[var(--border)]">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--card-foreground)]">{monthName}</h3>
        <div className="flex gap-2">
          <button
            onClick={handlePrevMonth}
            className="rounded-md p-1 hover:bg-[var(--control)] transition-colors"
            aria-label="Previous month"
          >
            ←
          </button>
          <button
            onClick={handleNextMonth}
            className="rounded-md p-1 hover:bg-[var(--control)] transition-colors"
            aria-label="Next month"
          >
            →
          </button>
        </div>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1">
        {dayLabels.map((label) => (
          <div key={label} className="text-center text-xs font-medium text-[var(--muted-foreground)]">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((dayData, idx) => {
          if (!dayData.date) {
            return <div key={`empty-${idx}`} className="aspect-square" />;
          }

          const dateStr = dayData.date.toISOString().slice(0, 10);
          const commitCount = contributions[dateStr] ?? 0;
          const isFuture = dayData.date > today;
          const isToday = dayData.date.toDateString() === today.toDateString();

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

          const tooltipText = !isFuture
            ? `${dayData.date.toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}: ${commitCount > 0 ? "Committed" : "Missed"}`
            : "";

          return (
            <div
              key={dateStr}
              className={`group relative aspect-square rounded-md ${bgColor} ${borderColor} transition-transform hover:scale-110 cursor-default ${
                isToday ? "ring-2 ring-[var(--accent)]" : ""
              }`}
              title={tooltipText}
            >
              {!isFuture && (
                <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white dark:text-gray-900 opacity-0 group-hover:opacity-100 transition-opacity">
                  {dayData.dayOfMonth}
                </span>
              )}
              {!isFuture && tooltipText && (
                <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-[var(--foreground)] px-2 py-1 text-xs text-[var(--background)] opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-10">
                  {tooltipText}
                  <div className="absolute top-full left-1/2 h-1 w-1 -translate-x-1/2 border-4 border-t-[var(--foreground)] border-transparent" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-[var(--muted-foreground)]">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-green-500" />
          <span>Committed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-gray-500" />
          <span>Missed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded border border-[var(--border)]" />
          <span>Future</span>
        </div>
      </div>
    </div>
  );
}
