"use client";

import { useCallback, useEffect, useState } from "react";

interface Repo {
  name: string;
  commits: number;
  url: string;
}

export default function TopRepos() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [minutesAgo, setMinutesAgo] = useState(0);

  const fetchRepos = useCallback(() => {
    setLoading(true);
    setError(null);

    fetch(`/api/metrics/repos?days=${days}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed request");
        return r.json();
      })
      .then((d: { repos: Repo[] }) => {
        setRepos(d.repos ?? []);
      })
      .catch(() => {
        setError("We couldn't load your top repositories right now. Please try again in a moment.");
        setRepos([]);
      })
      .finally(() => {
        setLoading(false);
        setLastUpdated(new Date());
        setMinutesAgo(0);
      });
  }, [days]);

  useEffect(() => {
    fetchRepos();
  }, [fetchRepos]);

  useEffect(() => {
    if (!lastUpdated) return;

    const interval = setInterval(() => {
      const diff = Math.floor((Date.now() - lastUpdated.getTime()) / 60000);
      setMinutesAgo(diff);
    }, 60000);

    return () => clearInterval(interval);
  }, [lastUpdated]);

  const maxCommits = repos[0]?.commits ?? 1;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[var(--card-foreground)]">
          Top Repositories
        </h2>

        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="rounded-lg border border-[var(--border)] bg-[var(--control)] px-2 py-1 text-sm"
        >
          <option value={7}>Last 7d</option>
          <option value={30}>Last 30d</option>
          <option value={90}>Last 90d</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 rounded bg-[var(--card-muted)] animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-6 text-sm text-red-500">
          {error}
        </div>
      ) : repos.length === 0 ? (
        <div className="text-center py-10 text-[var(--muted-foreground)]">
          No repositories found for the last {days} days.
        </div>
      ) : (
        <ul className="space-y-3">
          {repos.map((repo, idx) => {
            const barWidth = Math.max(
              Math.round((repo.commits / maxCommits) * 100),
              4
            );

            const shortName = repo.name.split("/")[1] ?? repo.name;

            return (
              <li key={repo.name}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <a
                    href={repo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate hover:text-[var(--accent)]"
                  >
                    #{idx + 1} {shortName}
                  </a>

                  <span className="text-[var(--muted-foreground)]">
                    {repo.commits} commits
                  </span>
                </div>

                <div className="h-1.5 rounded-full bg-[var(--control)] overflow-hidden">
                  <div
                    className="h-full bg-[var(--accent)]"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {lastUpdated && (
        <p className="text-xs text-right text-[var(--muted-foreground)] mt-2">
          {minutesAgo === 0 ? "Updated just now" : `Updated ${minutesAgo} min ago`}
        </p>
      )}
    </div>
  );
}