"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAccount } from "@/components/AccountContext";
import type { RepoHealthScore } from "@/types/repo-health";

interface Repo {
  name: string;
  commits: number;
  url: string;
  description: string | null;
}

export default function TopRepos() {
  const { selectedAccount } = useAccount();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [minutesAgo, setMinutesAgo] = useState(0);
  const [healthScores, setHealthScores] = useState<Record<string, RepoHealthScore>>({});
  const [healthLoading, setHealthLoading] = useState(true);
  const [sortColumn, setSortColumn] = useState<"commits" | "name">("commits");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const fetchRepos = useCallback(() => {
    setLoading(true);
    setError(null);
    const accountParam = selectedAccount !== null
      ? `&accountId=${encodeURIComponent(selectedAccount)}`
      : "";
    fetch(`/api/metrics/repos?days=${days}${accountParam}`)
      .then((r) => r.json())
      .then((d: { repos: Repo[] }) => setRepos(d.repos ?? []))
      .catch(() => setError("We couldn't load your top repositories right now. Please try again in a moment."))
      .finally(() => {
        setLoading(false);
        setLastUpdated(new Date());
        setMinutesAgo(0);
      });
  }, [days, selectedAccount]);

  const fetchHealthScores = useCallback(() => {
    setHealthLoading(true);
    const accountParam = selectedAccount !== null
      ? `?accountId=${encodeURIComponent(selectedAccount)}`
      : "";
    fetch(`/api/metrics/repo-health${accountParam}${accountParam ? "&" : "?"}days=${days}`)
      .then((r) => r.json())
      .then((d: { repos: RepoHealthScore[] }) => {
        const map: Record<string, RepoHealthScore> = {};
        for (const item of d.repos ?? []) {
          map[item.repo] = item;
        }
        setHealthScores(map);
      })
      .catch(() => setHealthScores({}))
      .finally(() => setHealthLoading(false));
  }, [days, selectedAccount]);

  useEffect(() => {
    if (!lastUpdated) return;
    const interval = setInterval(() => {
      const diff = Math.floor((Date.now() - lastUpdated.getTime()) / 60000);
      setMinutesAgo(diff);
    }, 60000);
    return () => clearInterval(interval);
  }, [lastUpdated]);


  useEffect(() => {
    fetchRepos();
    fetchHealthScores();
  }, [fetchRepos, fetchHealthScores, selectedAccount]);
  // toggle sort: same column flips direction, new column resets to desc
  const handleSort = (column: "commits" | "name") => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };
  // sort repos based on selected column and direction before rendering
  const sortedRepos = [...repos].sort((a, b) => {
    if (sortColumn === "name") {
      const nameA = (a.name.split("/")[1] ?? a.name).toLowerCase();
      const nameB = (b.name.split("/")[1] ?? b.name).toLowerCase();
      return sortDirection === "asc"
        ? nameA.localeCompare(nameB)
        : nameB.localeCompare(nameA);
    }
    return sortDirection === "asc"
      ? a.commits - b.commits
      : b.commits - a.commits;
  });

  const maxCommits = sortedRepos[0]?.commits ?? 1;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[var(--card-foreground)]">Top Repositories</h2>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          aria-label="Select time range for top repositories"
          className="rounded-lg border border-[var(--border)] bg-[var(--control)] px-2 py-1 text-sm text-[var(--card-foreground)] focus:outline-none focus:border-[var(--accent)]"
        >
          <option value={7}>Last 7d</option>
          <option value={30}>Last 30d</option>
          <option value={90}>Last 90d</option>
        </select>
      </div>
      {loading ? (
        <div
          role="status"
          aria-live="polite"
          aria-busy="true"
          className="space-y-3"
        >
          <span className="sr-only">Loading top repositories</span>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              aria-hidden="true"
              className="h-10 rounded bg-[var(--card-muted)] animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          <p>{error}</p>
          <button
            type="button"
            onClick={fetchRepos}
            className="mt-3 rounded-md border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/10"
          >
            Try again
          </button>
        </div>
      ) : repos.length === 0 ? (
        
        <p className="text-sm text-[var(--muted-foreground)]">No commits in the last {days} days.</p>
      ) : (
      /* column headers — clicking sorts the list */
      <>
        <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)] mb-2 px-0">
          <button
            type="button"
            onClick={() => handleSort("name")}
            className="flex items-center gap-1 hover:text-[var(--card-foreground)] transition-colors"
            aria-label="Sort by repository name"
          >
            Repository
            <span aria-hidden="true">
              {sortColumn === "name" ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}
            </span>
          </button>
          <button
            type="button"
            onClick={() => handleSort("commits")}
            className="flex items-center gap-1 hover:text-[var(--card-foreground)] transition-colors"
            aria-label="Sort by commit count"
          >
            Commits
            <span aria-hidden="true">
              {sortColumn === "commits" ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}
            </span>
          </button>
        </div>
        <ul className="space-y-3">
          {sortedRepos.map((repo, idx) => {
            const barWidth = Math.max(
              Math.round((repo.commits / maxCommits) * 100),
              4
            );
            const shortName = repo.name.split("/")[1] ?? repo.name;
            const health = healthScores[repo.name];
            const badgeTitle = health
              ? `Commits: ${health.signals.commitFrequency} | PR Merge Rate: ${Math.round(
                  health.signals.prMergeRate * 100
                )}% | Avg PR Time: ${Math.round(
                  health.signals.avgPrOpenTimeHours
                )}h | Open Issues: ${health.signals.openIssuesCount} | Last Commit: ${health.signals.daysSinceLastCommit} days ago`
              : undefined;
            const badgeClass =
              health?.grade === "green"
                ? "bg-green-500/15 text-green-300 border border-green-500/25"
                : health?.grade === "yellow"
                  ? "bg-yellow-500/15 text-yellow-300 border border-yellow-500/25"
                  : "bg-red-500/15 text-red-300 border border-red-500/25";
             return (
              <li key={repo.name}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <div className="flex items-center gap-1.5 max-w-[60%] sm:max-w-[70%]">
                    <span className="text-[var(--muted-foreground)] shrink-0">#{idx + 1}</span>
                    <Link
                      href={`/dashboard/repo-health/${repo.name}`}
                      className="truncate font-medium text-[var(--card-foreground)] transition-colors hover:text-[var(--accent)]"
                      title={`View ${repo.name} health explorer`}
                    >
                      {shortName}
                    </Link>
                    <a
                      href={repo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                      title="View on GitHub"
                    >
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                      </svg>
                    </a>
                  </div>
                  <span className="shrink-0 flex items-center gap-2">
                    {healthLoading ? (
                      <div className="h-5 w-9 rounded bg-[var(--card-muted)] animate-pulse" />
                    ) : health ? (
                      <Link
                        href={`/dashboard/repo-health/${repo.name}`}
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold hover:opacity-85 hover:scale-105 transition-all cursor-pointer ${badgeClass}`}
                        title={`${badgeTitle} • Click to open health explorer`}
                      >
                        {health.score}
                      </Link>
                    ) : (
                      <span
                        className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--control)] px-2 py-0.5 text-xs font-semibold text-[var(--muted-foreground)]"
                        title="Not enough data to calculate health score"
                      >
                        --
                      </span>
                    )}
                    <span className="text-[var(--muted-foreground)]">
                      {repo.commits} commit{repo.commits !== 1 ? "s" : ""}
                    </span>
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[var(--control)]">
                  <div
                    className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
        </>
      )}
      {lastUpdated && (
        <p className="text-xs text-[var(--muted-foreground)] mt-2 text-right">
         {minutesAgo === 0 ? "Updated just now" : `Updated ${minutesAgo} min ago`}
        </p>
     )}
    </div>
  );
}
