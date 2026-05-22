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
  const [rateLimitResetTime, setRateLimitResetTime] = useState<Date | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);

  useEffect(() => {
    if (!rateLimitResetTime) return;
    const msUntilReset = rateLimitResetTime.getTime() - Date.now();
    if (msUntilReset <= 0) {
      setIsRateLimited(false);
      setRateLimitResetTime(null);
      return;
    }
    const timer = setTimeout(() => {
      setIsRateLimited(false);
      setRateLimitResetTime(null);
      setError(null);
    }, msUntilReset);
    return () => clearTimeout(timer);
  }, [rateLimitResetTime]);

  const fetchCIAnalytics = useCallback(() => {
    if (isRateLimited) return;
    setLoading(true);
    setError(null);

    const accountParam =
      selectedAccount !== null
        ? `?accountId=${encodeURIComponent(selectedAccount)}`
        : "";

    fetch(`/api/metrics/ci${accountParam}`)
      .then((res) => {
        if (res.status === 403) {
          const resetHeader = res.headers.get("X-RateLimit-Reset");
          if (resetHeader) {
            const resetDate = new Date(parseInt(resetHeader, 10) * 1000);
            const resetTimeStr = resetDate.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });
            setRateLimitResetTime(resetDate);
            setIsRateLimited(true);
            throw new Error(
              `GitHub API rate limit reached. Resets at ${resetTimeStr}. Try again later.`
            );
          }
          throw new Error("GitHub API rate limit reached. Please try again later.");
        }
        if (!res.ok) throw new Error("API error");
        return res.json();
      })
      .then((payload: CIAnalyticsData) => {
        setData(payload);
        setIsRateLimited(false);
        setRateLimitResetTime(null);
      })
      .catch((err: Error) => {
        setError(
          err.message.includes("rate limit")
            ? err.message
            : "CI data unavailable - ensure Actions are enabled on your repos"
        );
      })
      .finally(() => setLoading(false));
  }, [selectedAccount, isRateLimited]);

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

  const refreshLabel = isRateLimited
    ? rateLimitResetTime
      ? `Retry at ${rateLimitResetTime.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}`
      : "Rate limited"
    : "Refresh";

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
          disabled={isRateLimited || loading}
          title={isRateLimited ? "GitHub API rate limit reached" : "Refresh CI data"}
          className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--muted-foreground)] transition-colors hover:bg-[var(--control)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {refreshLabel}
        </button>
      </div>

      {loading ? (
        <div
          role="status"
          aria-live="polite"
          aria-busy="true"
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
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
        <div
          className={`rounded-lg border p-4 text-sm ${
            isRateLimited
              ? "border-[var(--border)] bg-[var(--control)] text-[var(--warning)]"
              : "border-[var(--destructive)]/20 bg-[var(--destructive)]/10 text-[var(--destructive)]"
          }`}
        >
          <p>{error}</p>
          {!isRateLimited && (
            <button
              type="button"
              onClick={fetchCIAnalytics}
              className="mt-3 rounded-md border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--destructive)] transition-colors hover:bg-[var(--destructive)]/10"
            >
              Try again
            </button>
          )}
        </div>
      ) : data ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
