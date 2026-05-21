"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount } from "@/components/AccountContext";

interface CommunityData {
  discussionsStarted: number;
  acceptedAnswers: number;
  commentsPosted: number;
}

export default function CommunityMetrics() {
  const { selectedAccount } = useAccount();
  const [metrics, setMetrics] = useState<CommunityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(() => {
    setLoading(true);
    setError(null);

    const url =
      selectedAccount !== null
        ? `/api/metrics/discussions?accountId=${encodeURIComponent(selectedAccount)}`
        : "/api/metrics/discussions";

    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error("API error");
        }
        return response.json();
      })
      .then((data: CommunityData) => setMetrics(data))
      .catch(() =>
        setError(
          "We couldn't load your discussion analytics right now. Please try again in a moment."
        )
      )
      .finally(() => setLoading(false));
  }, [selectedAccount]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const stats = metrics
    ? [
        { label: "Discussions Started (30d)", value: metrics.discussionsStarted },
        { label: "Accepted Answers", value: metrics.acceptedAnswers },
        { label: "Discussion Comments", value: metrics.commentsPosted },
      ]
    : [];

  const isEmpty =
    metrics != null &&
    metrics.discussionsStarted === 0 &&
    metrics.acceptedAnswers === 0 &&
    metrics.commentsPosted === 0;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--card-foreground)]">
            Community Discussions
          </h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            GitHub Discussions activity across the selected account
          </p>
        </div>
        <button
          type="button"
          onClick={fetchMetrics}
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
          className="space-y-4"
        >
          <span className="sr-only">Loading discussion analytics</span>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                aria-hidden="true"
                className="h-20 rounded-lg bg-[var(--card-muted)] animate-pulse"
              />
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          <p>{error}</p>
          <button
            type="button"
            onClick={fetchMetrics}
            className="mt-3 rounded-md border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/10"
          >
            Try again
          </button>
        </div>
      ) : metrics ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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

          {isEmpty && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--control)]/60 p-4 text-sm text-[var(--muted-foreground)]">
              No discussion activity yet in this 30-day window.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}