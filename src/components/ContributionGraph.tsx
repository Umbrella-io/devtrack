"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAccount } from "@/components/AccountContext";
import CommitSearchPanel from "@/components/CommitSearchPanel";
import type { CommitItem } from "@/lib/github";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface DayData {
  day: string;
  commits: number;
}

interface GraphPoint {
  date: string;
  you: number;
  friend: number;
}

interface ContributionSources {
  github?: Record<string, number>;
  gitlab?: Record<string, number>;
}

interface ContributionResponse {
  data: Record<string, number>;
  commits?: CommitItem[];
  sources?: ContributionSources;
}

type ViewMode = "bar" | "line" | "area";

const RANGES = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
];

const charts: { key: ViewMode; label: string }[] = [
  { key: "bar", label: "Bar" },
  { key: "line", label: "Line" },
  { key: "area", label: "Area" },
];

function mergeContributionData(myData: DayData[], friendData: DayData[]): GraphPoint[] {
  const map = new Map<string, GraphPoint>();

  myData.forEach((day) => {
    map.set(day.day, {
      date: day.day,
      you: day.commits,
      friend: 0,
    });
  });

  friendData.forEach((day) => {
    if (!map.has(day.day)) {
      map.set(day.day, {
        date: day.day,
        you: 0,
        friend: day.commits,
      });
    } else {
      map.get(day.day)!.friend = day.commits;
    }
  });

  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function mergeContributionSources(
  sources: ContributionSources | undefined,
  fallback: Record<string, number>
): Record<string, number> {
  if (!sources) return fallback;

  const github = sources.github ?? fallback;
  const gitlab = sources.gitlab ?? {};
  const merged = { ...github };

  for (const [day, commits] of Object.entries(gitlab)) {
    merged[day] = (merged[day] ?? 0) + commits;
  }

  return merged;
}

function formatDateLabel(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function ContributionGraph() {
  const { selectedAccount } = useAccount();
  const [data, setData] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [chartType, setChartType] = useState<ViewMode>("bar");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [minutesAgo, setMinutesAgo] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [commits, setCommits] = useState<CommitItem[]>([]);

  const [compareMode, setCompareMode] = useState(false);
  const [compareUser, setCompareUser] = useState<string | null>(null);
  const [friendData, setFriendData] = useState<DayData[]>([]);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareRequestId, setCompareRequestId] = useState(0);

  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [showPopover, setShowPopover] = useState(false);
  const [customLabel, setCustomLabel] = useState<string | null>(null);
  const [customError, setCustomError] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const stored = localStorage.getItem("devtrack:contribution-range");
      if (stored === "7" || stored === "30" || stored === "90" || stored === "365") {
        setDays(Number(stored));
      } else {
        localStorage.setItem("devtrack:contribution-range", "30");
      }
    } catch {
      setDays(30);
    }
  }, []);

  const handleRangeChange = (newDays: number) => {
    setDays(newDays);
    setCustomLabel(null);
    setCustomFrom("");
    setCustomTo("");
    setCustomError(null);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("devtrack:contribution-range", String(newDays));
      } catch {
        // ignore storage errors
      }
    }
  };

  const fetchGraph = useCallback(async () => {
    setLoading(true);
    setError(null);
    setCommits([]);

    const accountParam = selectedAccount !== null ? `&accountId=${encodeURIComponent(selectedAccount)}` : "";
    const useCustomRange = Boolean(customLabel && customFrom && customTo);
    const url = useCustomRange
      ? `/api/metrics/contributions?from=${customFrom}&to=${customTo}${accountParam}`
      : `/api/metrics/contributions?days=${days}${accountParam}`;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("API error");

      const res = (await response.json()) as ContributionResponse;
      const merged = mergeContributionSources(res.sources, res.data ?? {});
      const sorted = Object.entries(merged)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([day, commits]) => ({ day, commits }));

      setData(sorted);
      setCommits(res.commits ?? []);
    } catch {
      setError("Failed to load contribution data.");
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
      setMinutesAgo(0);
    }
  }, [customFrom, customLabel, customTo, days, selectedAccount]);

  useEffect(() => {
    void fetchGraph();
  }, [fetchGraph]);

  useEffect(() => {
    if (!lastUpdated) return;

    const interval = setInterval(() => {
      setMinutesAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 60000));
    }, 60000);

    return () => clearInterval(interval);
  }, [lastUpdated]);

  useEffect(() => {
    if (!compareMode || !compareUser) {
      setFriendData([]);
      setCompareError(null);
      return;
    }

    setCompareLoading(true);
    setCompareError(null);

    fetch(`/api/metrics/contributions?days=${days}&username=${encodeURIComponent(compareUser)}`)
      .then((response) => {
        if (!response.ok) throw new Error("Failed to fetch friend data");
        return response.json();
      })
      .then((res: { data: Record<string, number> }) => {
        const sorted = Object.entries(res.data ?? {})
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([day, commits]) => ({ day, commits }));
        setFriendData(sorted);
      })
      .catch(() => {
        setCompareError("Failed to load friend data");
        setFriendData([]);
      })
      .finally(() => {
        setCompareLoading(false);
      });
  }, [compareMode, compareUser, days, compareRequestId]);

  useEffect(() => {
    const onCompareUser = (event: Event) => {
      const customEvent = event as CustomEvent<{ username?: string }>;
      const username = customEvent.detail?.username?.trim();
      if (!username) return;
      setCompareUser(username);
      setCompareMode(true);
      setCompareError(null);
      setCompareRequestId((previous) => previous + 1);
    };

    const onClearCompareUser = () => {
      setCompareMode(false);
      setCompareUser(null);
      setFriendData([]);
      setCompareError(null);
    };

    const handleToggleChart = () => {
      setChartType((previous) => {
        if (previous === "bar") return "line";
        if (previous === "line") return "area";
        return "bar";
      });
    };

    window.addEventListener("devtrack:compare-user", onCompareUser as EventListener);
    window.addEventListener("devtrack:clear-compare-user", onClearCompareUser);
    window.addEventListener("toggleChart", handleToggleChart);

    return () => {
      window.removeEventListener("devtrack:compare-user", onCompareUser as EventListener);
      window.removeEventListener("devtrack:clear-compare-user", onClearCompareUser);
      window.removeEventListener("toggleChart", handleToggleChart);
    };
  }, []);

  useEffect(() => {
    if (!showPopover) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowPopover(false);
    };

    const onMouseDown = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setShowPopover(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onMouseDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onMouseDown);
    };
  }, [showPopover]);

  const handleClearCompare = () => {
    window.dispatchEvent(new Event("devtrack:clear-compare-user"));
  };

  const handleCustomApply = () => {
    setCustomError(null);
    const today = new Date().toISOString().slice(0, 10);

    if (!customFrom || !customTo) {
      setCustomError("Please select both dates.");
      return;
    }
    if (customFrom > customTo) {
      setCustomError("Start date must be before end date.");
      return;
    }
    if (customTo > today) {
      setCustomError("End date can't be in the future.");
      return;
    }

    const msPerDay = 1000 * 60 * 60 * 24;
    const diff = (new Date(customTo).getTime() - new Date(customFrom).getTime()) / msPerDay;
    if (diff > 365 * 2) {
      setCustomError("Max range is 2 years.");
      return;
    }

    setCustomLabel(`${formatDateLabel(customFrom)} - ${formatDateLabel(customTo)}`);
    setShowPopover(false);
  };

  const mergedData = compareMode && data.length > 0 ? mergeContributionData(data, friendData) : [];
  const displayData = compareMode ? mergedData : data;
  const hasFriendData = compareMode && friendData.length > 0 && !compareError;

  return (
    <div id="contribution-activity" className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm" aria-busy={loading}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            {compareMode && compareUser ? `You vs ${compareUser}` : "Commit Activity"}
          </h2>
          {compareMode && compareError && (
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">{compareError}</p>
          )}
          {compareMode && compareLoading && (
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">Loading friend data...</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={fetchGraph}
            disabled={loading}
            aria-label="Refresh Commit Activity"
            className="flex h-8 items-center justify-center rounded-md border border-[var(--border)] px-3 text-sm text-[var(--muted-foreground)] transition-colors hover:bg-[var(--control)] hover:text-[var(--card-foreground)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Refresh
          </button>

          <div className="flex gap-1 rounded-lg border border-[var(--border)] bg-[var(--background)] p-1">
            {RANGES.map((range) => (
              <button
                key={range.days}
                type="button"
                onClick={() => handleRangeChange(range.days)}
                aria-label={`Show ${range.days}-day range`}
                aria-pressed={days === range.days && !customLabel}
                className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                  days === range.days && !customLabel
                    ? "bg-[var(--accent)] text-[var(--background)]"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>

          <div className="relative" ref={popoverRef}>
            <button
              type="button"
              onClick={() => setShowPopover((value) => !value)}
              className={`rounded-md border border-[var(--border)] px-3 py-1 text-sm font-medium transition-colors ${
                customLabel
                  ? "bg-[var(--accent)] text-[var(--background)]"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              {customLabel ?? "Custom..."}
            </button>

            {showPopover && (
              <div className="absolute right-0 top-10 z-50 w-72 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-lg">
                <p className="mb-3 text-sm font-medium text-[var(--foreground)]">Custom range</p>
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-[var(--muted-foreground)]">
                    Start date
                    <input
                      type="date"
                      value={customFrom}
                      max={new Date().toISOString().slice(0, 10)}
                      onChange={(event) => setCustomFrom(event.target.value)}
                      className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-sm text-[var(--foreground)]"
                    />
                  </label>
                  <label className="text-xs text-[var(--muted-foreground)]">
                    End date
                    <input
                      type="date"
                      value={customTo}
                      max={new Date().toISOString().slice(0, 10)}
                      onChange={(event) => setCustomTo(event.target.value)}
                      className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-sm text-[var(--foreground)]"
                    />
                  </label>
                  {customError && <p className="text-xs text-[var(--destructive)]">{customError}</p>}
                  {customLabel && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomLabel(null);
                        setCustomFrom("");
                        setCustomTo("");
                        setCustomError(null);
                        setShowPopover(false);
                      }}
                      className="w-full rounded-md border border-[var(--border)] py-1.5 text-sm font-medium text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleCustomApply}
                    className="mt-1 w-full rounded-md bg-[var(--accent)] py-1.5 text-sm font-medium text-[var(--background)] transition-opacity hover:opacity-90"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>

          {displayData.length > 0 && !error && (
            <div role="group" aria-label="Chart type" className="flex gap-1 rounded-lg border border-[var(--border)] bg-[var(--background)] p-1 text-sm">
              {charts.map((chart) => (
                <button
                  key={chart.key}
                  type="button"
                  onClick={() => setChartType(chart.key)}
                  aria-pressed={chartType === chart.key}
                  className={`rounded-md px-3 py-1 transition-colors duration-200 focus:outline-none ${
                    chartType === chart.key
                      ? "bg-[var(--accent)] text-[var(--background)]"
                      : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {chart.label}
                </button>
              ))}
            </div>
          )}

          {compareMode && (
            <button
              type="button"
              onClick={handleClearCompare}
              className="rounded-md border border-[var(--border)] px-3 py-1 text-sm font-medium text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {loading && data.length === 0 ? (
        <div className="h-[220px] animate-pulse rounded bg-[var(--card-muted)]" />
      ) : error && data.length === 0 ? (
        <div className="flex h-[220px] items-center rounded-lg border border-red-500/30 bg-red-500/10 px-4">
          <p className="text-sm text-red-400">{error} Please try refreshing.</p>
        </div>
      ) : displayData.length === 0 ? (
        <p className="flex h-[220px] items-center justify-center rounded-lg border border-dashed border-[var(--border)] bg-[var(--background)] px-4 text-sm text-[var(--muted-foreground)]">
          No commits in the last {days} days.
        </p>
      ) : (
        <div className="h-[220px] w-full overflow-hidden">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "bar" ? (
              compareMode && hasFriendData ? (
                <BarChart data={displayData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" hide />
                  <YAxis stroke="var(--muted-foreground)" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      color: "var(--foreground)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "var(--foreground)", fontSize: "12px" }}
                    cursor={{ fill: "var(--background)" }}
                  />
                  <Legend wrapperStyle={{ color: "var(--muted-foreground)", fontSize: "12px" }} />
                  <Bar dataKey="you" fill="var(--accent)" radius={[4, 4, 0, 0]} name="You" />
                  <Bar dataKey="friend" fill="var(--muted-foreground)" radius={[4, 4, 0, 0]} name={compareUser ?? "Friend"} />
                </BarChart>
              ) : (
                <BarChart data={displayData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey={compareMode ? "date" : "day"} hide />
                  <YAxis stroke="var(--muted-foreground)" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      color: "var(--foreground)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "var(--foreground)", fontSize: "12px" }}
                    cursor={{ fill: "var(--background)" }}
                  />
                  <Bar dataKey="commits" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              )
            ) : chartType === "line" ? (
              compareMode && hasFriendData ? (
                <LineChart data={displayData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" hide />
                  <YAxis stroke="var(--muted-foreground)" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      color: "var(--foreground)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "var(--foreground)", fontSize: "12px" }}
                    cursor={{ fill: "var(--background)" }}
                  />
                  <Legend wrapperStyle={{ color: "var(--muted-foreground)", fontSize: "12px" }} />
                  <Line type="monotone" dataKey="you" stroke="var(--accent)" strokeWidth={2} dot={false} name="You" />
                  <Line type="monotone" dataKey="friend" stroke="var(--muted-foreground)" strokeWidth={2} strokeDasharray="4 4" dot={false} name={compareUser ?? "Friend"} />
                </LineChart>
              ) : (
                <LineChart data={displayData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey={compareMode ? "date" : "day"} hide />
                  <YAxis stroke="var(--muted-foreground)" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      color: "var(--foreground)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "var(--foreground)", fontSize: "12px" }}
                    cursor={{ fill: "var(--background)" }}
                  />
                  <Line type="monotone" dataKey="commits" stroke="var(--accent)" strokeWidth={2} dot={false} />
                </LineChart>
              )
            ) : compareMode && hasFriendData ? (
              <AreaChart data={displayData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" hide />
                <YAxis stroke="var(--muted-foreground)" allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    color: "var(--foreground)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "var(--foreground)", fontSize: "12px" }}
                  cursor={{ fill: "var(--background)" }}
                />
                <Legend wrapperStyle={{ color: "var(--muted-foreground)", fontSize: "12px" }} />
                <Area type="monotone" dataKey="you" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.3} name="You" />
                <Area type="monotone" dataKey="friend" stroke="var(--muted-foreground)" fill="var(--muted-foreground)" fillOpacity={0.3} name={compareUser ?? "Friend"} />
              </AreaChart>
            ) : (
              <AreaChart data={displayData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey={compareMode ? "date" : "day"} hide />
                <YAxis stroke="var(--muted-foreground)" allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    color: "var(--foreground)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "var(--foreground)", fontSize: "12px" }}
                  cursor={{ fill: "var(--background)" }}
                />
                <Area type="monotone" dataKey="commits" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.3} />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      )}

      {error && data.length > 0 && (
        <p className="mt-3 text-sm text-red-400">{error} Showing the last successful data.</p>
      )}

      {lastUpdated && !compareMode && (
        <p className="mt-2 text-right text-xs text-[var(--muted-foreground)]">
          {minutesAgo === 0 ? "Updated just now" : `Updated ${minutesAgo} min ago`}
        </p>
      )}

      {compareMode && compareUser && !compareLoading && !compareError && (
        <p className="mt-2 text-right text-xs text-[var(--muted-foreground)]">Comparing with {compareUser}</p>
      )}

      {!compareMode && <CommitSearchPanel commits={commits} loading={loading} />}
    </div>
  );
}
