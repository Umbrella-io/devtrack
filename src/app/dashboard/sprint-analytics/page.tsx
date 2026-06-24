"use client";

import { useMemo, useState } from "react";
import SprintBurnDown from "@/components/SprintBurnDown";
import { useBurnDownData, SprintIssue } from "@/components/useBurnDownData";

// ---------------------------------------------------------------------------
// Mock data — replace with real Supabase/API data
// ---------------------------------------------------------------------------
const MOCK_SPRINT_START = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000); // 8 days ago
const MOCK_SPRINT_END = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000);   // 6 days from now

const MOCK_ISSUES: SprintIssue[] = [
  // Day 1 issues
  { id: "1", title: "Auth: GitHub OAuth setup", storyPoints: 8, closedAt: new Date(MOCK_SPRINT_START.getTime() + 1 * 86400000), createdAt: MOCK_SPRINT_START },
  { id: "2", title: "Dashboard layout", storyPoints: 5, closedAt: new Date(MOCK_SPRINT_START.getTime() + 2 * 86400000), createdAt: MOCK_SPRINT_START },
  { id: "3", title: "Contribution graph", storyPoints: 8, closedAt: new Date(MOCK_SPRINT_START.getTime() + 3 * 86400000), createdAt: MOCK_SPRINT_START },
  { id: "4", title: "PR Analytics widget", storyPoints: 5, closedAt: new Date(MOCK_SPRINT_START.getTime() + 5 * 86400000), createdAt: MOCK_SPRINT_START },
  { id: "5", title: "Streak Tracker", storyPoints: 5, closedAt: new Date(MOCK_SPRINT_START.getTime() + 6 * 86400000), createdAt: MOCK_SPRINT_START },
  { id: "6", title: "Goal Tracker", storyPoints: 8, closedAt: null, createdAt: MOCK_SPRINT_START },
  { id: "7", title: "Top Repos list", storyPoints: 5, closedAt: null, createdAt: MOCK_SPRINT_START },
  { id: "8", title: "Mobile responsive layout", storyPoints: 8, closedAt: null, createdAt: MOCK_SPRINT_START },
  // Scope creep — added Day 4
  {
    id: "9",
    title: "Dark mode toggle (added mid-sprint)",
    storyPoints: 5,
    closedAt: null,
    createdAt: new Date(MOCK_SPRINT_START.getTime() + 3 * 86400000),
  },
  // Scope creep — added Day 6
  {
    id: "10",
    title: "Export CSV (added mid-sprint)",
    storyPoints: 3,
    closedAt: null,
    createdAt: new Date(MOCK_SPRINT_START.getTime() + 5 * 86400000),
  },
];

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------
function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "green" | "red" | "blue" | "orange";
}) {
  const colors = {
    green: "text-emerald-400",
    red: "text-red-400",
    blue: "text-blue-400",
    orange: "text-orange-400",
  };
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4">
      <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-2xl font-bold ${accent ? colors[accent] : "text-white"}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function SprintAnalytics() {
  const [sprintStart] = useState(MOCK_SPRINT_START);
  const [sprintEnd] = useState(MOCK_SPRINT_END);
  const [issues] = useState<SprintIssue[]>(MOCK_ISSUES);

  const {
    data,
    totalPoints,
    velocity,
    predictedCompletionDay,
    isDelayed,
    completedPoints,
    remainingPoints,
  } = useBurnDownData({ issues, sprintStartDate: sprintStart, sprintEndDate: sprintEnd });

  const sprintDays = useMemo(() => {
    const ms = sprintEnd.getTime() - sprintStart.getTime();
    return Math.round(ms / (1000 * 60 * 60 * 24)) + 1;
  }, [sprintStart, sprintEnd]);

  const currentDay = useMemo(() => {
    const ms = Date.now() - sprintStart.getTime();
    return Math.min(Math.max(Math.round(ms / 86400000) + 1, 1), sprintDays);
  }, [sprintStart, sprintDays]);

  const completionPercent = Math.round((completedPoints / totalPoints) * 100);

  const delayDays =
    isDelayed && predictedCompletionDay != null
      ? predictedCompletionDay - sprintDays
      : null;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">📊</span>
            <h1 className="text-2xl font-bold tracking-tight">Sprint Analytics</h1>
          </div>
          <p className="text-gray-400 text-sm">
            Real-time burn-down tracking with predictive velocity forecasting
          </p>
        </div>

        {/* Sprint meta bar */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 mb-6 flex flex-wrap gap-6 text-sm">
          <div>
            <span className="text-gray-500">Milestone </span>
            <span className="text-white font-semibold">Sprint 4</span>
          </div>
          <div>
            <span className="text-gray-500">Total </span>
            <span className="text-white font-semibold">{totalPoints} pts</span>
          </div>
          <div>
            <span className="text-gray-500">Day </span>
            <span className="text-white font-semibold">
              {currentDay} / {sprintDays}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Target </span>
            <span className="text-white font-semibold">
              {sprintEnd.toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
              })}
            </span>
          </div>
          {isDelayed && (
            <div className="ml-auto">
              <span className="inline-flex items-center gap-1.5 bg-red-950 border border-red-800 text-red-300 text-xs font-medium px-3 py-1 rounded-full">
                ⚠️ {delayDays}d projected delay
              </span>
            </div>
          )}
          {!isDelayed && predictedCompletionDay != null && (
            <div className="ml-auto">
              <span className="inline-flex items-center gap-1.5 bg-emerald-950 border border-emerald-800 text-emerald-300 text-xs font-medium px-3 py-1 rounded-full">
                ✅ On track
              </span>
            </div>
          )}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard
            label="Completed"
            value={`${completedPoints} pts`}
            sub={`${completionPercent}% done`}
            accent="green"
          />
          <StatCard
            label="Remaining"
            value={`${remainingPoints} pts`}
            sub={`${100 - completionPercent}% left`}
            accent={isDelayed ? "red" : "blue"}
          />
          <StatCard
            label="Velocity"
            value={`${velocity.toFixed(1)} pts/day`}
            sub="Rolling avg"
            accent="blue"
          />
          <StatCard
            label="Forecast"
            value={
              predictedCompletionDay != null
                ? `Day ${predictedCompletionDay}`
                : "Calculating…"
            }
            sub={
              isDelayed
                ? `${delayDays}d after deadline`
                : "Before deadline"
            }
            accent={isDelayed ? "red" : "green"}
          />
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>Sprint Progress</span>
            <span>{completionPercent}%</span>
          </div>
          <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${completionPercent}%`,
                background: isDelayed
                  ? "linear-gradient(90deg,#ef4444,#f97316)"
                  : "linear-gradient(90deg,#34d399,#10b981)",
              }}
            />
          </div>
        </div>

        {/* Chart */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wider">
            Burn-Down Chart
          </h2>
          <SprintBurnDown
            data={data}
            totalPoints={totalPoints}
            sprintDays={sprintDays}
            velocity={velocity}
            predictedCompletionDay={predictedCompletionDay}
            isDelayed={isDelayed}
          />
        </div>

        {/* Issue table */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
              Sprint Issues
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-800">
                  <th className="text-left px-5 py-3">Issue</th>
                  <th className="text-right px-5 py-3">Points</th>
                  <th className="text-center px-5 py-3">Status</th>
                  <th className="text-right px-5 py-3">Note</th>
                </tr>
              </thead>
              <tbody>
                {issues.map((issue) => {
                  const isNew =
                    issue.createdAt.getTime() > sprintStart.getTime() + 86400000;
                  return (
                    <tr
                      key={issue.id}
                      className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                    >
                      <td className="px-5 py-3 text-gray-200">
                        {issue.title}
                      </td>
                      <td className="px-5 py-3 text-right text-gray-400 font-mono">
                        {issue.storyPoints}
                      </td>
                      <td className="px-5 py-3 text-center">
                        {issue.closedAt ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-950 text-emerald-400 text-xs px-2.5 py-0.5 rounded-full border border-emerald-800">
                            ✓ Closed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-blue-950 text-blue-400 text-xs px-2.5 py-0.5 rounded-full border border-blue-800">
                            · Open
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {isNew && (
                          <span className="inline-flex items-center gap-1 bg-red-950 text-red-400 text-xs px-2.5 py-0.5 rounded-full border border-red-800">
                            ↑ Scope Creep
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}