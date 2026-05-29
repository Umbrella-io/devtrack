"use client";

import { useEffect, useState } from "react";
import { useAccount } from "@/components/AccountContext";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Language {
  name: string;
  bytes: number;
  percentage: number;
}

interface ChartEntry {
  name: string;
  value: number;
  bytes: number;
  color: string;
}

const GITHUB_LANG_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f7df1e",
  Python: "#3572A5",
  Go: "#00ADD8",
  Rust: "#dea584",
  Java: "#b07219",
  CSS: "#563d7c",
  HTML: "#e34c26",
  Ruby: "#701516",
  Shell: "#89e051",
  C: "#555555",
  "C++": "#f34b7d",
  "C#": "#178600",
  PHP: "#4f5d95",
  Swift: "#f05138",
  Kotlin: "#A97BFF",
  Dart: "#00B4AB",
};

const FALLBACK_COLOR = "var(--muted-foreground)";

function getLanguageColor(name: string): string {
  return GITHUB_LANG_COLORS[name] ?? FALLBACK_COLOR;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function CustomTooltip({
  active,
  payload,
}: any) {
  if (!active || !payload || payload.length === 0) return null;
  const entry = payload[0].payload as ChartEntry;
  return (
    <div
      style={{
        background: "var(--tooltip)",
        color: "var(--tooltip-foreground)",
        border: "1px solid var(--border)",
        borderRadius: "0.5rem",
        padding: "0.5rem 0.75rem",
        fontSize: "0.8rem",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      }}
    >
      <span style={{ fontWeight: 600 }}>{entry.name}</span>
      <br />
      Size: {formatBytes(entry.bytes)} ({entry.value.toFixed(1)}%)
    </div>
  );
}

export default function LanguagesCard() {
  const { selectedAccount } = useAccount();
  const [languages, setLanguages] = useState<Language[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const url = selectedAccount !== null
      ? `/api/metrics/languages?accountId=${encodeURIComponent(selectedAccount)}`
      : "/api/metrics/languages";
    fetch(url)
      .then((r) => r.json())
      .then((d: { languages: Language[] }) => setLanguages(d.languages ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedAccount]);


  const chartData: ChartEntry[] = languages.map((lang) => ({
    name: lang.name,
    value: lang.percentage,
    bytes: lang.bytes,
    color: getLanguageColor(lang.name),
  }));

  const mainLanguage = languages[0]?.name ?? "None";

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm flex flex-col h-full justify-between">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-[var(--card-foreground)]">
          Languages
        </h2>
        <p className="text-xs text-[var(--muted-foreground)]">
          Most-used languages in the past 90 days
        </p>
      </div>

      {loading ? (
        <div
          role="status"
          aria-live="polite"
          aria-busy="true"
          className="flex flex-col items-center justify-center py-8 space-y-4 my-auto"
        >
          <span className="sr-only">Loading language chart</span>
          <div className="h-24 w-24 rounded-full border-4 border-[var(--card-muted)] border-t-[var(--accent)] animate-spin" />
          <div className="h-4 w-24 bg-[var(--card-muted)] rounded animate-pulse" />
        </div>
      ) : languages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center my-auto">
          <p className="text-sm text-[var(--muted-foreground)]">
            No language data available.
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center w-full my-auto">
          <div className="relative w-full h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  dataKey="value"
                  labelLine={false}
                  label={false}
                  strokeWidth={1}
                  stroke="var(--card)"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>

                {/* Center label inside donut chart */}
                <Pie
                  data={[{ value: 1 }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={0}
                  outerRadius={0}
                  dataKey="value"
                  labelLine={false}
                  label={({ cx, cy }: { cx: number; cy: number }) => (
                    <>
                      <text
                        x={cx}
                        y={cy - 4}
                        textAnchor="middle"
                        dominantBaseline="central"
                        style={{
                          fontSize: "0.95rem",
                          fontWeight: 700,
                          fill: "var(--card-foreground)",
                        }}
                      >
                        {mainLanguage}
                      </text>
                      <text
                        x={cx}
                        y={cy + 12}
                        textAnchor="middle"
                        dominantBaseline="central"
                        style={{
                          fontSize: "0.7rem",
                          fill: "var(--muted-foreground)",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        Top Language
                      </text>
                    </>
                  )}
                >
                  <Cell fill="transparent" />
                </Pie>

                <Tooltip
                  content={(props) => (
                    <CustomTooltip {...props} />
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend Grid */}
          <div className="mt-4 w-full grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            {chartData.map((entry) => (
              <div key={entry.name} className="flex items-center gap-2 min-w-0">
                <span
                  style={{
                    display: "inline-block",
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: entry.color,
                    flexShrink: 0,
                  }}
                />
                <span className="truncate text-[var(--card-foreground)] font-medium">
                  {entry.name}
                </span>
                <span className="ml-auto shrink-0 text-[var(--muted-foreground)]">
                  {entry.value.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
