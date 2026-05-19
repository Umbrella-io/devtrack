"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount } from "@/components/AccountContext";

interface CIAnalyticsData {
  successRate: number;
  averageDurationMinutes: number;
  flakiestWorkflow: string | null;
  totalRuns: number;
  reposChecked: number;
}

export default function CIAnalytics() {
  const { selectedAccount } = useAccount();
  const [data, setData] = useState<CIAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCIAnalytics = useCallback(() => {
    setLoading(true);
    setError(null);

    const accountParam =
      selectedAccount !== null
        ? `?accountId=${encodeURIComponent(selectedAccount)}`
        : "";

    fetch(`/api/metrics/ci${accountParam}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error("API error");
        }
        return res.json();
      })
      .then((payload: CIAnalyticsData) => setData(payload))
      .catch(() =>
        setError("CI data unavailable - ensure Actions are enabled on your repos")
      )
      .finally(() => setLoading(false));
  }, [selectedAccount]);

  useEffect(() => {
    fetchCIAnalytics();
  }, [fetchCIAnalytics]);

  const stats = data
    ? [
        { label: "Success Rate", value: `${data.successRate}%` },
        { label: "Avg Duration", value: `${data.averageDurationMinutes}m` },
        { label: "Runs (30d)", value: data.totalRuns },
        { label: "Repos Checked", value: data.reposChecked },
      ]
    : [];

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--card-foreground)]">
            CI Analytics
          </h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            GitHub Actions health across your top repositories
          </p>
        </div>
        <button
          type="button"
          onClick={fetchCIAnalytics}
          className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--muted-foreground)] transition-colors hover:bg-[var(--control)]"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div
          role="status"
          aria-live="polite"
          aria-busy="true"
          className="grid grid-cols-2 gap-4"
        >
          <span className="sr-only">Loading CI analytics</span>
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              aria-hidden="true"
              className="h-20 rounded-lg bg-[var(--card-muted)] animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          <p>{error}</p>
          <button
            type="button"
            onClick={fetchCIAnalytics}
            className="mt-3 rounded-md border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/10"
          >
            Try again
          </button>
        </div>
      ) : data ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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

          <div className="rounded-lg bg-[var(--control)] p-4">
            <p className="text-sm font-medium text-[var(--card-foreground)]">
              Flakiest workflow
            </p>
            <p
              className="mt-1 truncate text-sm text-[var(--muted-foreground)]"
              title={data.flakiestWorkflow ?? undefined}
            >
              {data.flakiestWorkflow ?? "No failing workflows in this window"}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
