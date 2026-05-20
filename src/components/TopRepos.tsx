"use client";

import { useCallback, useEffect, useState } from "react";
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
                  <a
                    href={repo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="max-w-[60%] sm:max-w-[70%] truncate text-[var(--card-foreground)] transition-colors hover:text-[var(--accent)]"
                    title={repo.description || undefined}
                  >
                    <span className="mr-1 text-[var(--muted-foreground)]">#{idx + 1}</span>
                    {shortName}
                  </a>
                  <span className="shrink-0 flex items-center gap-2">
                    {healthLoading ? (
                      <div className="h-5 w-9 rounded bg-[var(--card-muted)] animate-pulse" />
                    ) : health ? (
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${badgeClass}`}
                        title={badgeTitle}
                      >
                        {health.score}
                      </span>
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
