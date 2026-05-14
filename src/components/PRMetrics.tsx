"use client";

import { useEffect, useState } from "react";

interface PRData {
  open: number;
  merged: number;
  avgReviewHours: number;
  mergeRate: string;
}

export default function PRMetrics() {
  const [metrics, setMetrics] = useState<PRData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/metrics/prs")
      .then((r) => r.json())
      .then((data: PRData) => setMetrics(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stats = metrics
    ? [
        { label: "Open PRs", value: metrics.open },
        { label: "Merged (30d)", value: metrics.merged },
        { label: "Avg Review Time", value: `${metrics.avgReviewHours}h` },
        { label: "Merge Rate", value: metrics.mergeRate },
      ]
    : [];

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-[var(--card-foreground)]">PR Analytics</h2>
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 rounded-lg bg-[var(--card-muted)] p-4 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg bg-[var(--control)] p-4 text-center"
            >
              <div className="text-2xl font-bold text-[var(--accent)]">
                {stat.value}
              </div>
              <div className="mt-1 text-sm text-[var(--muted-foreground)]">{stat.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
