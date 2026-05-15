"use client";

import { useEffect, useState } from "react";

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

  useEffect(() => {
    setLoading(true);
    fetch("/api/metrics/languages")
      .then((r) => r.json())
      .then((d: { languages: Language[] }) => setLanguages(d.languages ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-[var(--card-foreground)] mb-4">
        Language Breakdown
      </h2>

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
      ) : (
        <>
          {/* Stacked bar */}
          <div className="flex h-6 w-full overflow-hidden rounded-full bg-[var(--control)]">
            {languages.map((lang) => (
              <div
                key={lang.name}
                className="h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full"
                style={{
                  width: `${lang.percentage}%`,
                  backgroundColor: getColor(lang.name),
                  minWidth: lang.percentage > 0 ? "4px" : "0px",
                }}
                title={`${lang.name}: ${lang.percentage}%`}
              />
            ))}
          </div>

          {/* Legend */}
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
            {languages.map((lang) => (
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
      )}
    </div>
  );
}
