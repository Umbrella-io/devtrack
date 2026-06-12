"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Skeleton } from "@/components/Skeleton";
import type { FollowerEntry, FollowerSortMetric } from "@/lib/follower-leaderboard";

interface FollowerLeaderboardPayload {
  generatedAt: string;
  metric: FollowerSortMetric;
  entries: FollowerEntry[];
}

const SORT_OPTIONS: Array<{ value: FollowerSortMetric; label: string; unit: string }> = [
  { value: "streak", label: "Streak", unit: "days" },
  { value: "commits", label: "Commits", unit: "this month" },
  { value: "prs", label: "PRs Merged", unit: "this month" },
];

function getMetricValue(entry: FollowerEntry, metric: FollowerSortMetric): number {
  if (metric === "streak") return entry.streak;
  if (metric === "commits") return entry.commitsThisMonth;
  return entry.mergedPullRequests;
}

function LoadingSkeleton() {
  return (
    <div role="status" aria-label="Loading follower leaderboard">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="grid grid-cols-[64px_1fr_100px_100px] items-center gap-4 border-b border-[var(--border)] px-4 py-4 md:grid-cols-[64px_1fr_120px_120px_100px]"
        >
          <Skeleton className="h-7 w-8 rounded" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full shrink-0" />
            <Skeleton className="h-4 w-28 rounded" />
          </div>
          <Skeleton className="h-6 w-14 rounded" />
          <Skeleton className="h-6 w-14 rounded" />
          <Skeleton className="hidden h-8 w-16 rounded md:block" />
        </div>
      ))}
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const medals: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
  if (medals[rank]) {
    return (
      <span className="text-xl" aria-label={`Rank ${rank}`} role="img">
        {medals[rank]}
      </span>
    );
  }
  return (
    <span className="text-base font-bold text-[var(--muted-foreground)]">
      #{rank}
    </span>
  );
}

export default function FollowerLeaderboard() {
  const [sort, setSort] = useState<FollowerSortMetric>("streak");
  const [data, setData] = useState<FollowerLeaderboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);

  const loadLeaderboard = useCallback(
    async (metric: FollowerSortMetric, signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/leaderboard/followers?sort=${metric}`, {
          signal,
          credentials: "include",
        });

        if (res.status === 429 || res.status === 503) {
          const body = await res.json().catch(() => ({}));
          const after = Number(res.headers.get("Retry-After") ?? body.retryAfter ?? 30);
          setRetryAfter(after);
          setError(
            res.status === 429
              ? "Too many requests. Please wait a moment before refreshing."
              : (body.error ?? "GitHub rate limit reached. Please try again shortly.")
          );
          return;
        }

        if (!res.ok) {
          setError("Failed to load follower leaderboard.");
          return;
        }

        const payload: FollowerLeaderboardPayload = await res.json();
        setData(payload);
        setRetryAfter(null);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError("Failed to load follower leaderboard.");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    const controller = new AbortController();
    loadLeaderboard(sort, controller.signal);
    return () => controller.abort();
  }, [sort, loadLeaderboard]);

  const activeMeta = SORT_OPTIONS.find((o) => o.value === sort) ?? SORT_OPTIONS[0];

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-soft)]">
      {/* Sort controls */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] px-4 py-3">
        <span className="mr-1 text-sm font-medium text-[var(--muted-foreground)]">
          Sort by:
        </span>
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setSort(opt.value)}
            aria-pressed={sort === opt.value}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
              sort === opt.value
                ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)]"
                : "border-[var(--border)] bg-[var(--card)] text-[var(--card-foreground)] hover:bg-[var(--control)]"
            }`}
          >
            {opt.label}
          </button>
        ))}
        {data && (
          <span className="ml-auto text-xs text-[var(--muted-foreground)]">
            Updated {new Date(data.generatedAt).toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Table header */}
      {!error && (
        <div
          className="grid grid-cols-[64px_1fr_100px_100px] border-b border-[var(--border)] bg-[var(--control)] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)] md:grid-cols-[64px_1fr_120px_120px_100px]"
          role="rowgroup"
          aria-label="Leaderboard columns"
        >
          <div role="columnheader">Rank</div>
          <div role="columnheader">Follower</div>
          <div role="columnheader">{activeMeta.label}</div>
          <div role="columnheader" className="hidden md:block">
            Commits
          </div>
          <div role="columnheader">Profile</div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <LoadingSkeleton />
      ) : error ? (
        <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
          <p className="text-sm text-[var(--muted-foreground)]">{error}</p>
          {retryAfter !== null ? (
            <p className="text-xs text-[var(--muted-foreground)]">
              Try again in {retryAfter}s
            </p>
          ) : (
            <button
              onClick={() => loadLeaderboard(sort)}
              className="mt-1 text-sm font-medium text-[var(--accent)] hover:underline"
            >
              Retry
            </button>
          )}
        </div>
      ) : !data || data.entries.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
          <span className="text-5xl" role="img" aria-label="telescope">
            🔭
          </span>
          <p className="mt-4 text-base font-semibold text-[var(--foreground)]">
            No followers found
          </p>
          <p className="max-w-xs text-sm text-[var(--muted-foreground)]">
            Follow some developers on GitHub or check back once your followers
            have public activity.
          </p>
        </div>
      ) : (
        <table className="w-full" role="table" aria-label="Follower leaderboard">
          <tbody>
            {data.entries.map((entry) => (
              <tr
                key={entry.username}
                className="grid grid-cols-[64px_1fr_100px_100px] items-center border-b border-[var(--border)] px-4 py-4 last:border-b-0 hover:bg-[var(--control)]/40 transition-colors md:grid-cols-[64px_1fr_120px_120px_100px]"
              >
                <td className="flex items-center justify-start">
                  <RankBadge rank={entry.rank} />
                </td>
                <td className="flex min-w-0 items-center gap-3">
                  <Image
                    src={entry.avatarUrl}
                    alt={`${entry.username} avatar`}
                    width={40}
                    height={40}
                    unoptimized
                    className="h-10 w-10 shrink-0 rounded-full border border-[var(--border)]"
                  />
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-[var(--card-foreground)]">
                      @{entry.username}
                    </div>
                    <div className="text-xs text-[var(--muted-foreground)]">
                      {entry.streak}d streak · {entry.mergedPullRequests} PRs
                    </div>
                  </div>
                </td>
                <td>
                  <div className="text-lg font-semibold text-[var(--card-foreground)]">
                    {getMetricValue(entry, sort)}
                  </div>
                  <div className="text-xs text-[var(--muted-foreground)]">
                    {activeMeta.unit}
                  </div>
                </td>
                <td className="hidden md:table-cell">
                  <div className="text-sm font-medium text-[var(--card-foreground)]">
                    {entry.commitsThisMonth}
                  </div>
                  <div className="text-xs text-[var(--muted-foreground)]">
                    this month
                  </div>
                </td>
                <td>
                  <Link
                    href={entry.profileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="secondary-button inline-flex rounded-lg px-3 py-2 text-sm font-medium"
                    aria-label={`View ${entry.username} on GitHub`}
                  >
                    GitHub
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
