"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount } from "@/components/AccountContext";
import PRStatusDonutChart from "./PRStatusDonutChart";

interface PRData {
  open: number;
  merged: number;
  closed: number;
  avgReviewHours: number;
  avgFirstReviewHours: number | null;
  mergeRate: string;
}

interface ReviewData {
  totalReviews: number;
  approvalRate: string;
  topRepos: Array<{ repo: string; count: number }>;
}

function formatReviewCycle(hours: number | null): string {
  if (hours === null) return "—";
  if (hours < 24) return `${hours}h`;
  return `${Math.round((hours / 24) * 10) / 10}d`;
}

export default function PRMetrics() {
  const { selectedAccount } = useAccount();
  const [metrics, setMetrics] = useState<PRData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"authored" | "reviews">("authored");
  const [reviews, setReviews] = useState<ReviewData | null>(null);
  const [reviewLoading, setReviewLoading] = useState(true);

  const fetchMetrics = useCallback(() => {
    setLoading(true);
    setError(null);
    const url = selectedAccount !== null
      ? `/api/metrics/prs?accountId=${encodeURIComponent(selectedAccount)}`
      : "/api/metrics/prs";
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error("API error");
        return r.json();
      })
      .then((data: PRData) => setMetrics(data))
      .catch(() => setError("We couldn't load your PR analytics right now. Please try again in a moment."))
      .finally(() => setLoading(false));
  }, [selectedAccount]);

  const fetchReviews = useCallback(() => {
    setReviewLoading(true);
    const url = selectedAccount !== null
      ? `/api/metrics/prs?accountId=${encodeURIComponent(selectedAccount)}&reviews=true`
      : "/api/metrics/prs?reviews=true";
    fetch(url)
      .then((r) => r.json())
      .then((data: { reviews: ReviewData }) => setReviews(data.reviews ?? null))
      .catch(() => setReviews(null))
      .finally(() => setReviewLoading(false));
  }, [selectedAccount]);

  useEffect(() => {
    fetchMetrics();
    fetchReviews();
  }, [fetchMetrics, fetchReviews]);

  const stats = metrics
    ? [
        { label: "Open PRs", value: metrics.open },
        { label: "Merged (30d)", value: metrics.merged },
        { label: "Avg Review Time", value: `${metrics.avgReviewHours}h` },
        {
          label: "Avg First Review",
          value: formatReviewCycle(metrics.avgFirstReviewHours),
          title: "Average time from PR open to first review comment or approval",
        },
        { label: "Merge Rate", value: metrics.mergeRate },
      ]
    : [];

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[var(--card-foreground)]">PR Analytics</h2>
        <div className="flex rounded-lg border border-[var(--border)] overflow-hidden text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("authored")}
            className={`px-3 py-1.5 transition-colors ${activeTab === "authored" ? "bg-[var(--accent)] text-[var(--accent-foreground)]" : "bg-[var(--control)] text-[var(--muted-foreground)] hover:text-[var(--card-foreground)]"}`}
          >
            PRs Authored
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("reviews")}
            className={`px-3 py-1.5 transition-colors ${activeTab === "reviews" ? "bg-[var(--accent)] text-[var(--accent-foreground)]" : "bg-[var(--control)] text-[var(--muted-foreground)] hover:text-[var(--card-foreground)]"}`}
          >
            Reviews Given
          </button>
        </div>
      </div>

      {activeTab === "authored" ? (
        <>
          {loading ? (
            <div role="status" aria-live="polite" aria-busy="true" className="space-y-4">
              <span className="sr-only">Loading PR analytics</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} aria-hidden="true" className="bg-[var(--card-muted)] rounded-lg p-4 h-24 animate-pulse" />
                ))}
              </div>
              <div className="h-[270px] rounded-lg bg-[var(--card-muted)] animate-pulse" aria-hidden="true" />
            </div>
          ) : error ? (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
              <p>{error}</p>
              <button type="button" onClick={fetchMetrics} className="mt-3 rounded-md border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/10">
                Try again
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {stats.map((stat) => (
                  <div key={stat.label} className="rounded-lg bg-[var(--control)] p-4 text-center min-w-0" title={stat.title}>
                    <div className="truncate text-2xl font-bold text-[var(--accent)]">{stat.value}</div>
                    <div className="truncate mt-1 text-sm text-[var(--muted-foreground)]">{stat.label}</div>
                  </div>
                ))}
              </div>
              {metrics && (
                <div>
                  <p className="mb-2 text-sm font-medium text-[var(--muted-foreground)]">PR Status Distribution</p>
                  <PRStatusDonutChart open={metrics.open} merged={metrics.merged} closed={metrics.closed} />
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          {reviewLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-lg bg-[var(--card-muted)] animate-pulse" />
              ))}
            </div>
          ) : !reviews ? (
            <p className="text-sm text-[var(--muted-foreground)]">No review data available.</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-[var(--control)] p-4 text-center">
                  <div className="text-2xl font-bold text-[var(--accent)]">{reviews.totalReviews}</div>
                  <div className="mt-1 text-sm text-[var(--muted-foreground)]">Total Reviews</div>
                </div>
                <div className="rounded-lg bg-[var(--control)] p-4 text-center">
                  <div className="text-2xl font-bold text-[var(--accent)]">{reviews.approvalRate}</div>
                  <div className="mt-1 text-sm text-[var(--muted-foreground)]">Approval Rate</div>
                </div>
              </div>
              {reviews.topRepos.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-medium text-[var(--muted-foreground)]">Most Reviewed Repos</p>
                  <ul className="space-y-2">
                    {reviews.topRepos.map((r) => (
                      <li key={r.repo} className="flex items-center justify-between text-sm">
                        <span className="truncate text-[var(--card-foreground)]">{r.repo.split("/")[1] ?? r.repo}</span>
                        <span className="ml-2 shrink-0 text-[var(--muted-foreground)]">{r.count} reviews</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}