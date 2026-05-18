"use client";

import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

interface Language {
  name: string;
  bytes: number;
  percentage: number;
}

const LANG_COLORS: Record<string, string> = {
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
};

const FALLBACK_COLOR = "#6b7280";

function getColor(name: string): string {
  return LANG_COLORS[name] ?? FALLBACK_COLOR;
}

export default function LanguageBreakdown() {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"bar" | "pie">("pie");

  useEffect(() => {
    setLoading(true);
    fetch("/api/metrics/languages")
      .then((r) => r.json())
      .then((d: { languages: Language[] }) => setLanguages(d.languages ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalPercentage = languages.reduce((sum, lang) => sum + lang.percentage, 0);
  const roundedTotal = Math.round(totalPercentage * 10) / 10;

  const displayLanguages = [...languages];
  if (roundedTotal < 100 && languages.length > 0) {
    displayLanguages.push({
      name: "Other",
      bytes: 0,
      percentage: Math.round((100 - roundedTotal) * 10) / 10,
    });
  }

  const chartData = displayLanguages.map((lang) => ({
    name: lang.name,
    value: lang.percentage,
    color: getColor(lang.name),
  }));

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[var(--card-foreground)]">
          Language Breakdown
        </h2>
        <div className="flex gap-1 rounded-lg border border-gray-600 p-1">
          <button
            type="button"
            onClick={() => setView("pie")}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              view === "pie"
                ? "bg-indigo-500 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Pie
          </button>
          <button
            type="button"
            onClick={() => setView("bar")}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              view === "bar"
                ? "bg-[var(--primary)] text-white"
                : "text-[var(--muted-foreground)]"
            }`}
          >
            Bar
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="h-6 rounded-full bg-[var(--card-muted)] animate-pulse" />
          <div className="grid grid-cols-2 gap-2 mt-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-5 rounded bg-[var(--card-muted)] animate-pulse" />
            ))}
          </div>
        </div>
      ) : languages.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">
          No language data available.
        </p>
      ) : view === "pie" ? (
        <>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                dataKey="value"
                paddingAngle={2}
              >
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "var(--tooltip)",
                  color: "var(--tooltip-foreground)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value: number) => [`${value}%`]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
            {displayLanguages.map((lang) => (
              <div key={lang.name} className="flex items-center gap-2 text-sm">
                <span
                  className="inline-block h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: getColor(lang.name) }}
                />
                <span className="truncate text-[var(--card-foreground)]">
                  {lang.name}
                </span>
                <span className="ml-auto shrink-0 text-[var(--muted-foreground)]">
                  {lang.percentage}%
                </span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="flex h-6 w-full overflow-hidden rounded-full bg-[var(--control)]">
            {displayLanguages.map((lang) => (
              <div
                key={lang.name}
                className="h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full"
                style={{
                  width: `${lang.percentage}%`,
                  backgroundColor:
                    lang.name === "Other" ? "var(--control)" : getColor(lang.name),
                  minWidth: lang.percentage > 0 ? "4px" : "0px",
                }}
                title={`${lang.name}: ${lang.percentage}%`}
              />
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
            {displayLanguages.map((lang) => (
              <div key={lang.name} className="flex items-center gap-2 text-sm">
                <span
                  className="inline-block h-3 w-3 shrink-0 rounded-full"
                  style={{
                    backgroundColor:
                      lang.name === "Other" ? "var(--control)" : getColor(lang.name),
                  }}
                />
                <span className="truncate text-[var(--card-foreground)]">
                  {lang.name}
                </span>
                <span className="ml-auto shrink-0 text-[var(--muted-foreground)]">
                  {lang.percentage}%
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}