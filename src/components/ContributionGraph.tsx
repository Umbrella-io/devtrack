"use client";

import { useEffect, useState } from "react";
import { useAccount } from "@/components/AccountContext";
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

function mergeContributionData(
  myData: DayData[],
  friendData: DayData[]
): GraphPoint[] {
  const map = new Map<string, GraphPoint>();

  myData.forEach(d => {
    map.set(d.day, {
      date: d.day,
      you: d.commits,
      friend: 0,
    });
  });

  friendData.forEach(d => {
    if (!map.has(d.day)) {
      map.set(d.day, {
        date: d.day,
        you: 0,
        friend: d.commits,
      });
    } else {
      map.get(d.day)!.friend = d.commits;
    }
  });

  return Array.from(map.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );
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
  const [usesTouchTooltip, setUsesTouchTooltip] = useState(false);
  
  // Compare mode state
  const [compareMode, setCompareMode] = useState(false);
  const [compareUser, setCompareUser] = useState<string | null>(null);
  const [friendData, setFriendData] = useState<DayData[]>([]);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareRequestId, setCompareRequestId] = useState(0);

  // Fetch my data
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("devtrack:contribution-range");
        if (stored === "7" || stored === "30" || stored === "90" || stored === "365") {
          setDays(Number(stored));
        } else {
          localStorage.setItem("devtrack:contribution-range", "30");
          setDays(30);
        }
      } catch {
        setDays(30);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const media = window.matchMedia("(hover: none), (pointer: coarse)");
    const updateTooltipMode = () => setUsesTouchTooltip(media.matches);

    updateTooltipMode();
    media.addEventListener("change", updateTooltipMode);

    return () => media.removeEventListener("change", updateTooltipMode);
  }, []);

  const handleRangeChange = (newDays: number) => {
    setDays(newDays);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("devtrack:contribution-range", String(newDays));
      } catch {}
    }
  };

  useEffect(() => {
    setLoading(true);
    setError(null);
    const accountParam =
      selectedAccount !== null
        ? `&accountId=${encodeURIComponent(selectedAccount)}`
        : "";
    fetch(`/api/metrics/contributions?days=${days}${accountParam}`)
      .then((r) => {
        if (!r.ok) throw new Error("API error");
        return r.json();
      })
      .then((res: { data: Record<string, number> }) => {
        const sorted = Object.entries(res.data ?? {})
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([day, commits]) => ({ day, commits }));
        setData(sorted);
      })
      .catch(() => {
        setError("Failed to load contribution data.");
      })
      .finally(() => {
        setLoading(false);
        setLastUpdated(new Date());
        setMinutesAgo(0);
      });
  }, [days, selectedAccount]);

  // Fetch friend data when compare mode is on and compareUser changes
  useEffect(() => {
    if (!compareMode || !compareUser) {
      setFriendData([]);
      setCompareError(null);
      return;
    }

    setCompareLoading(true);
    setCompareError(null);
    
    fetch(`/api/metrics/contributions?days=${days}&username=${encodeURIComponent(compareUser)}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch friend data");
        return r.json();
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
      setCompareRequestId((prev) => prev + 1);
    };

    const onClearCompareUser = () => {
      setCompareMode(false);
      setCompareUser(null);
      setFriendData([]);
      setCompareError(null);
    };

    window.addEventListener("devtrack:compare-user", onCompareUser as EventListener);
    window.addEventListener("devtrack:clear-compare-user", onClearCompareUser);

    return () => {
      window.removeEventListener("devtrack:compare-user", onCompareUser as EventListener);
      window.removeEventListener("devtrack:clear-compare-user", onClearCompareUser);
    };
  }, []);

  useEffect(() => {
    const handleToggleChart = () => {
      setChartType((prev) => (prev === "bar" ? "line" : "bar"));
    };
    window.addEventListener("toggleChart", handleToggleChart);
    return () => window.removeEventListener("toggleChart", handleToggleChart);
  }, []);

  useEffect(() => {
    if (!lastUpdated) return;
    const interval = setInterval(() => {
      const diff = Math.floor((Date.now() - lastUpdated.getTime()) / 60000);
      setMinutesAgo(diff);
    }, 60000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  const handleClearCompare = () => {
    window.dispatchEvent(new Event("devtrack:clear-compare-user"));
    setCompareMode(false);
    setCompareUser(null);
    setFriendData([]);
    setCompareError(null);
  };

  const mergedData =
    compareMode && data.length > 0
      ? mergeContributionData(data, friendData)
      : [];

  const displayData = compareMode ? mergedData : data;
  const hasFriendData = compareMode && friendData.length > 0 && !compareError;
  const tooltipTrigger = usesTouchTooltip ? "click" : "hover";

  return (
    <div
      id="contribution-activity"
      className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            {compareMode && compareUser ? `You vs ${compareUser}` : "Your Commits"}
          </h2>
          {compareMode && compareError && (
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">{compareError}</p>
          )}
          {compareMode && compareLoading && (
            <p className="text-xs text-[var(--muted-foreground)] mt-1">Loading friend data...</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Range buttons */}
          <div className="flex gap-1 rounded-lg border border-[var(--border)] bg-[var(--background)] p-1">
            {RANGES.map((r) => (
              <button
                key={r.days}
                onClick={() => handleRangeChange(r.days)}
                aria-label={`Show ${r.days}-day range`}
                aria-pressed={days === r.days}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  days === r.days
                    ? "bg-[var(--accent)] text-[var(--background)]"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Chart Toggle Buttons */}
          {displayData.length > 0 && !error && (
            <div
              role="group"
              aria-label="Chart type"
              className="flex gap-1 rounded-lg border border-[var(--border)] bg-[var(--background)] p-1 text-sm"
            >
              {charts.map((chart) => (
                <button
                  key={chart.key}
                  type="button"
                  onClick={() => setChartType(chart.key)}
                  aria-pressed={chartType === chart.key}
                  className={`px-3 py-1 rounded-md transition-colors duration-200 focus:outline-none ${
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

          {/* Clear compare button */}
          {compareMode && (
            <button
              onClick={handleClearCompare}
              className="px-3 py-1 rounded-md text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors border border-[var(--border)]"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="h-[220px] rounded border border-[var(--border)] bg-[var(--background)] animate-pulse" />
      ) : error ? (
        <div className="flex h-[220px] items-center rounded-lg border border-[var(--border)] bg-[var(--background)] px-4">
          <p className="text-sm text-[var(--muted-foreground)]">
            {error} Please try refreshing.
          </p>
        </div>
      ) : displayData.length === 0 ? (
        <p className="flex h-[220px] items-center justify-center rounded-lg border border-dashed border-[var(--border)] bg-[var(--background)] px-4 text-sm text-[var(--muted-foreground)]">
          No commits in the last {days} days.
        </p>
      ) : (
        <div className="h-[220px] w-full overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === "bar" ? (
            <BarChart data={displayData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis 
                dataKey={compareMode ? "date" : "day"} 
                hide 
              />
              <YAxis stroke="var(--muted-foreground)" allowDecimals={false} />
              <Tooltip
                trigger={tooltipTrigger}
                contentStyle={{
                  background: "var(--card)",
                  color: "var(--foreground)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                }}
                labelStyle={{
                  color: "var(--foreground)",
                  fontSize: "12px",
                }}
                cursor={{ fill: "var(--background)" }}
              />
              {hasFriendData && (
                <Legend wrapperStyle={{ color: "var(--muted-foreground)", fontSize: "12px" }} />
              )}
              {compareMode && hasFriendData ? (
                <>
                  <Bar
                    dataKey="you"
                    fill="var(--accent)"
                    radius={[4, 4, 0, 0]}
                    name="You"
                  />
                  <Bar
                    dataKey="friend"
                    fill="var(--muted-foreground)"
                    radius={[4, 4, 0, 0]}
                    name={`${compareUser}`}
                  />
                </>
              ) : (
                <Bar
                  dataKey="commits"
                  fill="var(--accent)"
                  radius={[4, 4, 0, 0]}
                />
              )}
            </BarChart>
          ) : chartType === "line" ? (
            <LineChart data={displayData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis 
                dataKey={compareMode ? "date" : "day"} 
                hide 
              />
              <YAxis stroke="var(--muted-foreground)" allowDecimals={false} />
              <Tooltip
                trigger={tooltipTrigger}
                contentStyle={{
                  background: "var(--card)",
                  color: "var(--foreground)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                }}
                labelStyle={{
                  color: "var(--foreground)",
                  fontSize: "12px",
                }}
                cursor={{ fill: "var(--background)" }}
              />
              {hasFriendData && (
                <Legend wrapperStyle={{ color: "var(--muted-foreground)", fontSize: "12px" }} />
              )}
              {compareMode && hasFriendData ? (
                <>
                  <Line
                    type="monotone"
                    dataKey="you"
                    stroke="var(--accent)"
                    strokeWidth={2}
                    dot={false}
                    name="You"
                  />
                  <Line
                    type="monotone"
                    dataKey="friend"
                    stroke="var(--muted-foreground)"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                    name={`${compareUser}`}
                  />
                </>
              ) : (
                <Line
                  type="monotone"
                  dataKey="commits"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  dot={false}
                />
              )}
            </LineChart>
          ) : (
            <AreaChart data={displayData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis 
                dataKey={compareMode ? "date" : "day"} 
                hide 
              />
              <YAxis stroke="var(--muted-foreground)" allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  color: "var(--foreground)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                }}
                labelStyle={{
                  color: "var(--foreground)",
                  fontSize: "12px",
                }}
                cursor={{ fill: "var(--background)" }}
              />
              {hasFriendData && (
                <Legend wrapperStyle={{ color: "var(--muted-foreground)", fontSize: "12px" }} />
              )}
              {compareMode && hasFriendData ? (
                <>
                  <Area
                    type="monotone"
                    dataKey="you"
                    stroke="var(--accent)"
                    fill="var(--accent)"
                    fillOpacity={0.3}
                    name="You"
                  />
                  <Area
                    type="monotone"
                    dataKey="friend"
                    stroke="var(--muted-foreground)"
                    fill="var(--muted-foreground)"
                    fillOpacity={0.3}
                    name={`${compareUser}`}
                  />
                </>
              ) : (
                <Area
                  type="monotone"
                  dataKey="commits"
                  stroke="var(--accent)"
                  fill="var(--accent)"
                  fillOpacity={0.3}
                />
              )}
            </AreaChart>
          )}
        </ResponsiveContainer>
        </div>
      )}
      
      {lastUpdated && !compareMode && (
        <p className="mt-2 text-right text-xs text-[var(--muted-foreground)]">
          {minutesAgo === 0
            ? "Updated just now"
            : `Updated ${minutesAgo} min ago`}
        </p>
      )}
      
      {compareMode && compareUser && !compareLoading && !compareError && (
        <p className="mt-2 text-right text-xs text-[var(--muted-foreground)]">
          Comparing with {compareUser}
        </p>
      )}
    </div>
  );
}