"use client";

import { useRouter } from "next/navigation";

interface PRData {
  open: number;
  merged: number;
  avgReviewHours: number;
  mergeRate: string;
}

export default function PRMetrics({ metrics }: { metrics: PRData | null }) {
  const router = useRouter();

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
      
      {!metrics ? (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          <p>We couldn't load your PR analytics right now. Please try again in a moment.</p>
          <button
            type="button"
            onClick={() => router.refresh()}
            className="mt-3 rounded-md border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/10"
          >
            Try again
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg bg-[var(--control)] p-4 text-center"
            >
              <div className="text-2xl font-bold text-[var(--accent)]">
                {stat.value}
              </div>
              <div className="mt-1 text-sm text-[var(--muted-foreground)]">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
