"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface HistoryEntry {
  goal_id: string;
  period_start: string;
  period_end: string;
  target: number;
  achieved: number;
  completed: boolean;
}

interface GoalMeta {
  id: string;
  title: string;
  unit: string;
}

interface WeekRow {
  weekLabel: string;
  [goalTitle: string]: string | number;
}

const LINE_COLORS = [
  "var(--accent)",
  "#10B981",
  "#F59E0B",
  "#8B5CF6",
  "#EC4899",
  "#3B82F6",
];

function formatWeekLabel(periodEnd: string): string {
  const d = new Date(periodEnd);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function GoalHistory() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [histories, setHistories] = useState<HistoryEntry[]>([]);
  const [goals, setGoals] = useState<GoalMeta[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    fetch("/api/goals/history?weeks=8")
      .then((r) => r.json())
      .then((data) => {
        setHistories(data.histories ?? []);
        setGoals(data.goals ?? []);
      })
      .catch(() => setError("Failed to load history."))
      .finally(() => setLoading(false));
  }, [open]);

  // Build chart data: one row per unique week label, columns per goal
  const goalMap = new Map<string, GoalMeta>(goals.map((g) => [g.id, g]));

  const weekSet = new Set<string>();
  for (const h of histories) {
    weekSet.add(h.period_end.slice(0, 10));
  }
  const sortedWeeks = Array.from(weekSet).sort();

  const chartData: WeekRow[] = sortedWeeks.map((weekKey) => {
    const row: WeekRow = { weekLabel: formatWeekLabel(weekKey) };
    for (const h of histories) {
      if (h.period_end.slice(0, 10) !== weekKey) continue;
      const meta = goalMap.get(h.goal_id);
      const label = meta?.title ?? h.goal_id.slice(0, 8);
      const pct = h.target > 0 ? Math.round((h.achieved / h.target) * 100) : 0;
      row[label] = Math.min(pct, 100);
    }
    return row;
  });

  // Active goal titles that appear in history
  const activeGoalTitles = Array.from(
    new Set(
      histories
        .map((h) => goalMap.get(h.goal_id)?.title ?? h.goal_id.slice(0, 8))
    )
  );

  // Average completion over last 4 weeks
  const last4Weeks = sortedWeeks.slice(-4);
  let totalPct = 0;
  let count = 0;
  for (const h of histories) {
    if (!last4Weeks.includes(h.period_end.slice(0, 10))) continue;
    totalPct += h.target > 0 ? (h.achieved / h.target) * 100 : 0;
    count++;
  }
  const avgCompletion = count > 0 ? Math.round(totalPct / count) : null;

  const hasData = chartData.length >= 1 && activeGoalTitles.length > 0;

  return (
    <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-[var(--card-foreground)] hover:bg-[var(--card-muted)] transition-colors"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-4 h-4 text-[var(--accent)]"
            aria-hidden="true"
          >
            <path d="M15.5 2A1.5 1.5 0 0014 3.5v13a1.5 1.5 0 003 0v-13A1.5 1.5 0 0015.5 2zM9.5 6A1.5 1.5 0 008 7.5v9a1.5 1.5 0 003 0v-9A1.5 1.5 0 009.5 6zM3.5 10A1.5 1.5 0 002 11.5v5a1.5 1.5 0 003 0v-5A1.5 1.5 0 003.5 10z" />
          </svg>
          Goal History &amp; Analytics
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`w-4 h-4 text-[var(--muted-foreground)] transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-4">
          {loading && (
            <div className="py-8 text-center text-sm text-[var(--muted-foreground)]">
              Loading history…
            </div>
          )}

          {error && !loading && (
            <p className="py-4 text-sm text-[var(--destructive)]">{error}</p>
          )}

          {!loading && !error && !hasData && (
            <p className="py-4 text-sm text-[var(--muted-foreground)]">
              No history yet. Complete a recurring goal period to see trends here.
            </p>
          )}

          {!loading && !error && hasData && (
            <>
              {avgCompletion !== null && (
                <p className="mb-3 text-sm text-[var(--muted-foreground)]">
                  Average completion last 4 weeks:{" "}
                  <span className="font-semibold text-[var(--card-foreground)]">
                    {avgCompletion}%
                  </span>
                </p>
              )}

              <ResponsiveContainer width="100%" height={220}>
                <LineChart
                  data={chartData}
                  margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border)"
                    opacity={0.5}
                  />
                  <XAxis
                    dataKey="weekLabel"
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(value: number) => [`${value}%`, ""]}
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    labelStyle={{ color: "var(--card-foreground)" }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                  />
                  {activeGoalTitles.map((title, i) => (
                    <Line
                      key={title}
                      type="monotone"
                      dataKey={title}
                      stroke={LINE_COLORS[i % LINE_COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </>
          )}
        </div>
      )}
    </div>
  );
}