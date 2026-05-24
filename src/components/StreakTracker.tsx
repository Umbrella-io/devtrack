"use client";
import { useCallback, useEffect, useState, useRef } from "react";
import { useAccount } from "@/components/AccountContext";
import { useCountUp } from "@/hooks/useCountUp";
import StreakMilestoneBanner from "@/components/StreakMilestoneBanner";
import { useHeatmapTheme } from "@/hooks/useHeatmapTheme";
import { toast } from "sonner";
import { toPng } from "html-to-image";

const STREAK_MILESTONES = [7, 30, 50, 100, 200, 365];

interface StreakData {
  current: number;
  longest: number;
  lastCommitDate: string | null;
  totalActiveDays: number;
  freezeDates: string[];
}

interface ContributionData {
  days: number;
  total: number;
  data: Record<string, number>;
}

interface FreezeData {
  hasFreeze: boolean;
  freezeDate?: string | null;
}

interface WeekdayInsight {
  label: string;
  shortLabel: string;
  totalCommits: number;
  countDays: number;
  avgCommits: number;
}

interface StreakCalendarProps {
  contributions: Record<string, number>;
  freezeDates: string[];
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
}

function toLocalDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function calculateActiveDayInsights(data: Record<string, number> | undefined | null): {
  insights: WeekdayInsight[];
  peakDay: WeekdayInsight | null;
  isValid: boolean;
} {
  if (!data || Object.keys(data).length < 14) {
    return { insights: [], peakDay: null, isValid: false };
  }

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const shortNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const totals = [0, 0, 0, 0, 0, 0, 0];
  const counts = [0, 0, 0, 0, 0, 0, 0];

  for (const [dateStr, commitCount] of Object.entries(data)) {
    const parts = dateStr.split("-").map(Number);
    if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) continue;

    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    if (!Number.isNaN(date.getTime())) {
      const dayIdx = date.getDay();
      totals[dayIdx] += commitCount;
      counts[dayIdx] += 1;
    }
  }

  const insights: WeekdayInsight[] = dayNames.map((label, index) => ({
    label,
    shortLabel: shortNames[index],
    totalCommits: totals[index],
    countDays: counts[index],
    avgCommits: counts[index] > 0 ? totals[index] / counts[index] : 0,
  }));

  const peakDay = insights.reduce<WeekdayInsight | null>((currentPeak, item) => {
    if (!currentPeak || item.avgCommits > currentPeak.avgCommits) return item;
    return currentPeak;
  }, null);

  return { insights, peakDay, isValid: Boolean(peakDay && peakDay.avgCommits > 0) };
}

function calculateMonthlyTrend(contributionData: ContributionData | null): {
  isValid: boolean;
  thisMonth: number;
  text: string;
  colorClass: string;
} {
  if (!contributionData) {
    return { isValid: false, thisMonth: 0, text: "No trend", colorClass: "text-[var(--muted-foreground)]" };
  }

  const today = new Date();
  const thisMonth = Object.entries(contributionData.data).filter(([dateStr]) => {
    const [year, month] = dateStr.split("-").map(Number);
    return year === today.getFullYear() && month === today.getMonth() + 1;
  }).filter(([, count]) => count > 0).length;

  const prevMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const prevMonth = Object.entries(contributionData.data).filter(([dateStr]) => {
    const [year, month] = dateStr.split("-").map(Number);
    return year === prevMonthDate.getFullYear() && month === prevMonthDate.getMonth() + 1;
  }).filter(([, count]) => count > 0).length;

  if (thisMonth === 0 && prevMonth === 0) {
    return { isValid: false, thisMonth, text: "No trend", colorClass: "text-[var(--muted-foreground)]" };
  }

  const delta = thisMonth - prevMonth;
  return {
    isValid: true,
    thisMonth,
    text: delta >= 0 ? `Up ${delta} day${delta === 1 ? "" : "s"}` : `Down ${Math.abs(delta)} day${Math.abs(delta) === 1 ? "" : "s"}`,
    colorClass: delta >= 0 ? "text-[var(--success)]" : "text-[var(--destructive)]",
  };
}

export default function StreakTracker() {
  const { selectedAccount } = useAccount();
  const [data, setData] = useState<StreakData | null>(null);
  const [contributionData, setContributionData] = useState<ContributionData | null>(null);
  const [freezeDates, setFreezeDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissedMilestones, setDismissedMilestones] = useState<number[]>([]);
  const [lastCelebratedMilestone, setLastCelebratedMilestone] = useState<number>(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [minutesAgo, setMinutesAgo] = useState(0);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [freeze, setFreeze] = useState<FreezeData | null>(null);
  const [freezeLoading, setFreezeLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const animatedCurrent = useCountUp(data?.current ?? 0);
  const animatedLongest = useCountUp(data?.longest ?? 0);
  const animatedActiveDays = useCountUp(data?.totalActiveDays ?? 0);

const fetchFreeze = useCallback(async () => {
    setFreezeLoading(true);
    try {
      const response = await fetch("/api/streak/freeze");
      const freezeData = (await response.json()) as FreezeData;
      setFreeze(freezeData);
    } catch {
      setFreeze(null);
    } finally {
      setFreezeLoading(false);
    }
  }, []);

  const handleDownload = useCallback(async () => {
    if (!containerRef.current) return;
    try {
      setIsDownloading(true);
      const dataUrl = await toPng(containerRef.current, {
        cacheBust: true,
        style: { margin: "0" },
      });
      const link = document.createElement("a");
      link.download = "devtrack-streak.png";
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to generate image", err);
    } finally {
      setIsDownloading(false);
    }
  }, []);
    }
  }, []);

  const fetchStreak = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const streakUrl = selectedAccount !== null
        ? `/api/metrics/streak?accountId=${encodeURIComponent(selectedAccount)}`
        : "/api/metrics/streak";
      const contributionUrl = selectedAccount !== null
        ? `/api/metrics/contributions?days=365&accountId=${encodeURIComponent(selectedAccount)}`
        : "/api/metrics/contributions?days=365";

      const [streakRes, contributionRes] = await Promise.all([
        fetch(streakUrl),
        fetch(contributionUrl),
      ]);

      if (!streakRes.ok || !contributionRes.ok) {
        throw new Error("Failed to fetch data");
      }

      const streakData = (await streakRes.json()) as StreakData;
      const contribData = (await contributionRes.json()) as ContributionData;

      setData(streakData);
      setContributionData(contribData);
      setFreezeDates(streakData.freezeDates || []);
    } catch {
      setError("We couldn't load your streak data right now. Please try again in a moment.");
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
      setMinutesAgo(0);
    }
  }, [selectedAccount]);

  const refreshWidget = useCallback(async () => {
    await Promise.all([fetchStreak(), fetchFreeze()]);
  }, [fetchFreeze, fetchStreak]);

  useEffect(() => {
    void refreshWidget();
  }, [refreshWidget]);

  useEffect(() => {
    const stored = localStorage.getItem("devtrack:dismissed-milestones");
    const storedLastCelebrated = localStorage.getItem("devtrack:last-celebrated-milestone");

    if (stored) {
      try {
        setDismissedMilestones(JSON.parse(stored));
      } catch {
        setDismissedMilestones([]);
      }
    }

    if (storedLastCelebrated) {
      const parsed = Number(storedLastCelebrated);
      if (!Number.isNaN(parsed)) setLastCelebratedMilestone(parsed);
    }
  }, []);

  useEffect(() => {
    if (!lastUpdated) return;
    const interval = setInterval(() => {
      const diff = Math.floor((Date.now() - lastUpdated.getTime()) / 60000);
      setMinutesAgo(diff);
    }, 60000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

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
      await refreshWidget();
    } catch {
      await fetchFreeze();
    } finally {
      setCancelling(false);
    }
  }

  const isRefreshing = loading || freezeLoading;
  const showSkeleton = loading && !data;
  const MILESTONES = [
    { days: 30, label: "30-day streak!", emoji: "🏅" },
    { days: 14, label: "2-week streak!", emoji: "⭐" },
    { days: 7, label: "7-day streak!", emoji: "🔥" },
    { days: 3, label: "3-day streak!", emoji: "✨" },
  ];

  const badge = MILESTONES.find((m) => (data?.current ?? 0) >= m.days) ?? null;
  const activeDayData = calculateActiveDayInsights(contributionData?.data);
  const monthlyTrend = calculateMonthlyTrend(contributionData);

  const stats = data
    ? [
        {
          label: "Current Streak",
          value: animatedCurrent,
          unit: "days",
          highlight: data.current > 0,
          icon: "🔥",
          tooltip: "Current consecutive coding days",
        },
        {
          label: "Longest Streak",
          value: animatedLongest,
          unit: "days",
          highlight: false,
          icon: "🏆",
          tooltip: "Your longest streak ever",
        },
        {
          label: "Active Days (90d)",
          value: animatedActiveDays,
          unit: "days",
          highlight: false,
          icon: "📅",
          tooltip: "Days you made commits in the last 90 days",
        },
        {
          label: "Last Commit",
          value: data.lastCommitDate
            ? new Date(data.lastCommitDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
            : "—",
          unit: "",
          highlight: false,
          icon: "⚡",
          tooltip: "Your most recent commit",
        },
      ]
    : [];

const handleCopy = async () => {
    if (!data || !navigator.clipboard) return;
    const textToCopy = [
      "🔥 DevTrack Stats",
      `Current streak: ${data.current} days`,
      `Longest streak: ${data.longest} days`,
      `Active days: ${data.totalActiveDays}`,
    ].join("\n");
if (!navigator.clipboard) {
      toast.error("Clipboard is not supported in this browser.");
      return;
    }

    try {
      await navigator.clipboard.writeText(textToCopy);

      setCopied(true);

      toast.success("Streak stats copied to clipboard!");

      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy streak stats.");
    }
  };

  const currentMilestone = [...STREAK_MILESTONES].reverse().find((milestone) => (
    data?.current && data.current >= milestone && milestone > lastCelebratedMilestone
  ));
  const shouldShowBanner = Boolean(currentMilestone && !dismissedMilestones.includes(currentMilestone));

  const handleDismissBanner = () => {
    if (!currentMilestone) return;
    const updated = [...dismissedMilestones, currentMilestone];
    setDismissedMilestones(updated);
    setLastCelebratedMilestone(currentMilestone);
    localStorage.setItem("devtrack:last-celebrated-milestone", String(currentMilestone));
    localStorage.setItem("devtrack:dismissed-milestones", JSON.stringify(updated));
  };

  return (
    <>
      {shouldShowBanner && currentMilestone && (
        <StreakMilestoneBanner streak={currentMilestone} onDismiss={handleDismissBanner} />
      )}
<div className="relative" aria-busy={isRefreshing}>
        {data && (
          <div className="absolute top-6 right-6 flex items-center gap-2 z-10">
            <button
              type="button"
              onClick={refreshWidget}
              disabled={isRefreshing}
              aria-label="Refresh Commit Streaks"
              className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--muted-foreground)] transition-colors hover:bg-[var(--control)] hover:text-[var(--card-foreground)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isRefreshing ? "animate-spin" : ""}><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"></path><polyline points="21 3 21 8 16 8"></polyline></svg>
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="cursor-pointer flex h-8 items-center justify-center rounded-md px-2 text-sm text-[var(--muted-foreground)] hover:bg-[var(--control)] hover:text-[var(--card-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-colors"
              aria-label="Copy streak stats to clipboard"
            >
              {copied ? (
                <span className="text-xs font-medium text-[var(--success)]">Copied!</span>
              ) : (
                <span className="text-base opacity-80 hover:opacity-100">📋</span>
              )}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading}
              className="cursor-pointer flex h-8 items-center justify-center rounded-md px-3 py-1.5 text-xs font-medium bg-[var(--accent)] text-[var(--accent-foreground)] hover:opacity-90 disabled:opacity-70 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-colors gap-1.5 shadow-sm"
              aria-label="Download streak stats as image"
            >
              {isDownloading ? (
                <span className="w-4 h-4 rounded-full border-2 border-[var(--accent-foreground)]/30 border-t-[var(--accent-foreground)] animate-spin" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              )}
              <span>SHARE</span>
            </button>
          </div>
        )}

        <div ref={containerRef} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--card-foreground)]">
              Commit Streaks
            </h2>
            {data && <div className="h-8 w-36" />}
          </div>
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
            >
              <span className={isRefreshing ? "inline-block animate-spin" : "inline-block"} aria-hidden="true">↺</span>
            </button>

            {data && (
              <button
                type="button"
                onClick={handleCopy}
                className="flex h-8 items-center justify-center rounded-md px-2 text-sm text-[var(--muted-foreground)] transition-colors hover:bg-[var(--control)] hover:text-[var(--card-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                aria-label="Copy streak stats to clipboard"
              >
                {copied ? <span className="text-xs font-medium text-green-500">Copied!</span> : <span className="text-base opacity-80 hover:opacity-100">📋</span>}
              </button>
            )}
          </div>
        </div>

        {error ? (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
            <p>{error}</p>
            <button
              type="button"
              onClick={refreshWidget}
              className="mt-3 rounded-md border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/10"
            >
              Try again
            </button>
          </div>
        ) : showSkeleton ? (
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 rounded-lg bg-[var(--card-muted)] animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className={`rounded-lg p-4 text-center ${stat.highlight ? "border border-[var(--accent)]/40 bg-[var(--accent-soft)]" : "bg-[var(--control)]"}`}
                >
                  <div className="mb-1 text-xl" title={stat.tooltip} aria-label={stat.tooltip} role="img">
                    {stat.icon}
                  </div>
                  <div className={`text-2xl font-bold ${stat.highlight ? "text-[var(--accent)]" : "text-[var(--accent)]"}`}>
                    {stat.value}
                    {stat.unit && <span className="ml-1 text-sm font-normal text-[var(--muted-foreground)]">{stat.unit}</span>}
                  </div>
                  <div className="mt-1 text-xs text-[var(--muted-foreground)]">{stat.label}</div>
                </div>
              ))}
            </div>

            {monthlyTrend.isValid && (
              <div className="mt-3 flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-xs shadow-sm">
                <span className="text-[var(--muted-foreground)]">
                  This month: <strong className="font-semibold text-[var(--card-foreground)]">{monthlyTrend.thisMonth} active days</strong>
                </span>
                <span className={monthlyTrend.colorClass}>({monthlyTrend.text})</span>
              </div>
            )}

            {badge && (
              <div className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-3 py-2">
                <span>{badge.emoji}</span>
                <span className="text-sm font-medium text-[var(--accent)]">{badge.label}</span>
              </div>
            )}

            {activeDayData.isValid && activeDayData.peakDay && (
              <div className="mt-4 border-t border-[var(--border)] pt-4">
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                  <div>
                    <div className="text-xs font-medium text-[var(--muted-foreground)]">Most Active Day</div>
                    <div className="mt-0.5 text-sm font-semibold text-[var(--card-foreground)]">
                      {activeDayData.peakDay.label} <span className="text-xs font-normal text-[var(--muted-foreground)]">(avg {activeDayData.peakDay.avgCommits.toFixed(1)} commits)</span>
                    </div>
                  </div>

                  <div className="flex h-10 items-end gap-1.5 pt-2">
                    {activeDayData.insights.map((item) => {
                      const maxAvg = activeDayData.peakDay?.avgCommits ?? 1;
                      const heightPercent = maxAvg > 0 ? Math.max(15, Math.round((item.avgCommits / maxAvg) * 100)) : 15;
                      const isPeak = item.label === activeDayData.peakDay?.label;

                      return (
                        <div key={item.label} className="group relative flex cursor-default flex-col items-center gap-1" title={`${item.label}: avg ${item.avgCommits.toFixed(1)} commits`}>
                          <div className="flex h-8 w-5 items-end overflow-hidden rounded-sm bg-[var(--card-muted)]">
                            <div style={{ height: `${heightPercent}%` }} className={`w-full rounded-sm transition-all duration-300 ${isPeak ? "bg-[var(--accent)]" : "bg-[var(--accent)]/40 hover:bg-[var(--accent)]/60"}`} />
                          </div>
                          <span className={`text-[10px] leading-none ${isPeak ? "font-bold text-[var(--card-foreground)]" : "text-[var(--muted-foreground)]"}`}>
                            {item.shortLabel}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

{lastUpdated && (
              <p className="mt-2 text-right text-xs text-[var(--muted-foreground)]">
                {minutesAgo === 0 ? "Updated just now" : `Updated ${minutesAgo} min ago`}
              </p>
            )}
          </div>
        {/* Streak Calendar Section */}
        {contributionData ? (
          <>
            {/*
              Freeze dates are managed via the streak freeze API (/api/streak/freeze).
              Users can activate a freeze from the freeze button in this component.
              The calendar displays existing freeze dates from the API response.
              Future: add UI to manually mark/unmark past dates as frozen.
            */}
            <StreakCalendar
              contributions={contributionData.data}
              freezeDates={
                freeze?.freezeDate
                  ? Array.from(new Set([...freezeDates, freeze.freezeDate]))
                  : freezeDates
              }
              currentMonth={calendarMonth}
              onMonthChange={setCalendarMonth}
            />
          </>
        ) : null}
        </div>
      </div>
    </>
  );
}

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
                      className="rounded-md bg-[var(--destructive)]/10 px-2.5 py-1 text-xs font-medium text-[var(--destructive)] transition hover:bg-[var(--destructive)]/20 disabled:opacity-60"
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

            <StreakCalendar
              contributions={contributionData?.data ?? {}}
              freezeDates={freeze?.freezeDate ? Array.from(new Set([...freezeDates, freeze.freezeDate])) : freezeDates}
              currentMonth={calendarMonth}
              onMonthChange={setCalendarMonth}
            />
          </>
        )}
      </div>
    </>
  );
}

function StreakCalendar({
  contributions,
  freezeDates,
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

  const { getCalendarStyle, themeConfig } = useHeatmapTheme();
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
  const freezeSet = new Set(freezeDates);

  return (
    <div className="mt-6 border-t border-[var(--border)] pt-6">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[var(--card-foreground)]">{monthName}</h3>
        <div className="flex gap-2">
          <button type="button" onClick={handlePrevMonth} className="rounded-md px-2 py-1 text-sm font-medium transition-colors hover:bg-[var(--control)]" aria-label="Previous month">
            ← Prev
          </button>
          <button type="button" onClick={handleNextMonth} className="rounded-md px-2 py-1 text-sm font-medium transition-colors hover:bg-[var(--control)]" aria-label="Next month">
            Next →
          </button>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-7 gap-1">
        {dayLabels.map((label) => (
          <div key={label} className="text-center text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {calendarDays.map((dayData, idx) => {
          if (!dayData.date) {
            return <div key={`empty-${idx}`} className="aspect-square" />;
          }

          const dateStr = toLocalDateStr(dayData.date);
          const commitCount = contributions[dateStr] ?? 0;
          const isFuture = dayData.date > today;
          const isToday = dayData.date.toDateString() === today.toDateString();
          const isFrozen = freezeSet.has(dateStr) && commitCount === 0;

          let bgColor = "bg-transparent";
          let borderColor = "border border-[var(--border)]";
          let statusText = "";

          if (!isFuture) {
            if (isFrozen) {
              bgColor = "bg-[var(--accent)]/20";
              borderColor = "border border-[var(--accent)]/40";
              statusText = "Frozen";
            } else if (commitCount > 0) {
              bgColor = "bg-[var(--accent)]";
              borderColor = "border border-[var(--accent)]";
              statusText = "Committed";
            } else {
              bgColor = "bg-[var(--muted-foreground)]/20";
              borderColor = "border border-[var(--muted-foreground)]/30";
              statusText = "Missed";
            }
          }

          const cellStyle = isFuture
            ? { backgroundColor: "transparent", borderColor: themeConfig.border }
            : isFrozen
              ? undefined
              : getCalendarStyle(commitCount);

          const tooltipText = !isFuture
            ? `${dayData.date.toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}: ${statusText}${!isFrozen && commitCount > 0 ? ` (${commitCount})` : ""}`
            : "";

          return (
            <div
              key={dateStr}
              className={`group relative aspect-square cursor-default rounded-lg ${bgColor} ${borderColor} transition-all hover:scale-110 hover:shadow-lg ${isToday ? "ring-2 ring-[var(--accent)] ring-offset-1" : ""}`}
              style={cellStyle}
              title={tooltipText}
            >
              {!isFuture && (
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-[var(--accent-foreground)] opacity-0 transition-opacity group-hover:opacity-100">
                  {dayData.dayOfMonth}
                </span>
              )}
              {!isFuture && tooltipText && (
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[var(--foreground)] px-3 py-2 text-xs font-medium text-[var(--background)] opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                  {tooltipText}
                  <div className="absolute top-full left-1/2 h-1 w-1 -translate-x-1/2 border-4 border-transparent border-t-[var(--foreground)]" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap gap-6 text-sm">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 rounded-md bg-[var(--accent)]" />
          <span className="font-medium text-[var(--card-foreground)]">Committed</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 rounded-md border border-[var(--accent)]/40 bg-[var(--accent)]/20" />
          <span className="font-medium text-[var(--card-foreground)]">Frozen</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 rounded-md border border-[var(--muted-foreground)]/30 bg-[var(--muted-foreground)]/20" />
          <span className="font-medium text-[var(--card-foreground)]">Missed</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 rounded-md border-2 border-[var(--border)]" />
          <span className="font-medium text-[var(--card-foreground)]">Future</span>
        </div>
      </div>
      <p className="mt-2 text-xs text-[var(--muted-foreground)]">Frozen days are set via the streak freeze feature above.</p>
    </div>
  );
}

