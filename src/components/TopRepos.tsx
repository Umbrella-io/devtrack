"use client";

import { useEffect, useState } from "react";

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

  const fetchRepos = () => {
    setLoading(true);
    setError(null);
    fetch(`/api/metrics/repos?days=${days}`)
      .then((r) => r.json())
      .then((d: { repos: Repo[] }) => setRepos(d.repos ?? []))
      .catch(() =>
        setError(
          "We couldn't load your top repositories right now. Please try again in a moment."
        )
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRepos();
  }, [days]);

  const maxCommits = repos[0]?.commits ?? 1;

  return (
    <section
      aria-labelledby="top-repos-heading"
      className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm"
    >
      <div className="flex items-center justify-between mb-4">
        <h2
          id="top-repos-heading"
          className="text-lg font-semibold text-[var(--card-foreground)]"
        >
          Top Repositories
        </h2>
        <label htmlFor="repos-days-select" className="sr-only">
          Select time range
        </label>
        <select
          id="repos-days-select"
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          aria-label="Filter repositories by time range"
          className="rounded-lg border border-[var(--border)] bg-[var(--control)] px-2 py-1 text-sm text-[var(--card-foreground)] focus:outline-none focus:border-[var(--accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-3" role="status" aria-label="Loading top repositories">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 rounded bg-[var(--card-muted)] animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div
          role="alert"
          className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400"
        >
          <p>{error}</p>
          <button
            type="button"
            onClick={fetchRepos}
            aria-label="Retry loading top repositories"
            className="mt-3 rounded-md border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/10"
          >
            Try again
          </button>
        </div>
      ) : repos.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]" role="status">
          No commits in the last {days} days.
        </p>
      ) : (
        <ol
          className="space-y-3"
          aria-label={`Top repositories by commits in the last ${days} days`}
        >
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
                    aria-label={`${shortName} on GitHub, ${repo.commits} commit${repo.commits !== 1 ? "s" : ""} (opens in new tab)`}
                    className="max-w-[70%] truncate text-[var(--card-foreground)] transition-colors hover:text-[var(--accent)]"
                  >
                    <span className="mr-1 text-[var(--muted-foreground)]" aria-hidden="true">
                      #{idx + 1}
                    </span>
                    {shortName}
                  </a>
                  <span
                    className="shrink-0 text-[var(--muted-foreground)]"
                    aria-hidden="true"
                  >
                    {repo.commits} commit{repo.commits !== 1 ? "s" : ""}
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-valuenow={barWidth}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${shortName}: ${repo.commits} commit${repo.commits !== 1 ? "s" : ""}, ${barWidth}% of top repository`}
                  className="h-1.5 overflow-hidden rounded-full bg-[var(--control)]"
                >
                  <div
                    className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}