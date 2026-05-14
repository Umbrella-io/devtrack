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
  const [days, setDays] = useState(30);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/metrics/repos?days=${days}`)
      .then((r) => r.json())
      .then((d: { repos: Repo[] }) => setRepos(d.repos ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [days]);

  const maxCommits = repos[0]?.commits ?? 1;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[var(--card-foreground)]">Top Repositories</h2>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="rounded-lg border border-[var(--border)] bg-[var(--control)] px-2 py-1 text-sm text-[var(--card-foreground)] focus:outline-none focus:border-[var(--accent)]"
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
      ) : repos.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">No commits in the last {days} days.</p>
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
                    className="max-w-[70%] truncate text-[var(--card-foreground)] transition-colors hover:text-[var(--accent)]"
                    title={repo.name}
                  >
                    <span className="mr-1 text-[var(--muted-foreground)]">#{idx + 1}</span>
                    {shortName}
                  </a>
                  <span className="shrink-0 text-[var(--muted-foreground)]">
                    {repo.commits} commit{repo.commits !== 1 ? "s" : ""}
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
      )}
    </div>
  );
}
