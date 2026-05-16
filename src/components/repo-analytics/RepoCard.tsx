"use client";

import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";

import { ExplorerRepoCardData } from "@/lib/repoAnalytics";
import {
  formatRelativeDate,
  formatDate,
} from "@/lib/repoAnalyticsUtils";

interface RepoCardProps {
  repo: ExplorerRepoCardData;
  onViewAnalytics: (repo: ExplorerRepoCardData) => void;
}

export default function RepoCard({
  repo,
  onViewAnalytics,
}: RepoCardProps) {
  const activityData = Array.isArray(repo.activity7d) ? repo.activity7d : [];
  const activeDays = activityData.filter((day) => day.commits > 0).length;
  const consistency = activityData.length
    ? Math.round((activeDays / 7) * 100)
    : 0;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-slate-800/80 p-5 shadow-2xl shadow-black/20 backdrop-blur-xl"
    >
      {/* Border Glow */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-white/10" />

      <div className="relative flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold tracking-tight text-white">
              {repo.name}
            </h3>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span className="rounded-full border border-slate-700 bg-slate-800/70 px-2.5 py-1">
                {repo.commitCount} commits
              </span>

              <span className="rounded-full border border-slate-700 bg-slate-800/70 px-2.5 py-1">
                Created {formatDate(repo.createdAt)}
              </span>
            </div>
          </div>

          {/* Consistency */}
          <div className="flex flex-col items-end">
            <span className="text-lg font-semibold text-indigo-300">
              {consistency}%
            </span>

            <span className="text-[11px] text-slate-500">
              Consistency
            </span>
          </div>
        </div>

        {/* Activity Graph */}
        <div className="h-32 w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/40 p-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={activityData}>
              <defs>
                <linearGradient
                  id={`repoActivity-${repo.name}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="#818cf8"
                    stopOpacity={0.7}
                  />
                  <stop
                    offset="100%"
                    stopColor="#818cf8"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>

              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{
                  fill: "#64748b",
                  fontSize: 11,
                }}
              />

              <Tooltip
                cursor={false}
                contentStyle={{
                  background: "#020617",
                  border: "1px solid #1e293b",
                  borderRadius: "12px",
                  color: "#fff",
                }}
              />

              <Area
                type="monotone"
                dataKey="commits"
                stroke="#818cf8"
                strokeWidth={2.5}
                fill={`url(#repoActivity-${repo.name})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>
            Updated {formatRelativeDate(repo.updatedAt)}
          </span>

          <span>
            {repo.primaryLanguage ?? "Unknown"}
          </span>
        </div>

        {/* Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <a
            href={repo.htmlUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
          >
            Repo
          </a>

          <button
            type="button"
            onClick={() => onViewAnalytics(repo)}
            className="flex items-center justify-center rounded-2xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-3 text-sm font-medium text-indigo-300 transition hover:bg-indigo-500/20"
          >
            View
          </button>
        </div>
      </div>
    </motion.article>
  );
}
