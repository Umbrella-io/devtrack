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
      .then((res) => {
        if (!res.ok) throw new Error("Request failed");
        return res.json();
      })
      .then((data: { repos: Repo[] }) => {
        setRepos(data.repos ?? []);
      })
      .catch(() => {
        setError("Failed to load repositories. Please try again.");
        setRepos([]);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchRepos();
  }, [days]);

  const maxCommits = repos.length > 0 ? repos[0].commits : 1;

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
            <div
              key={i}
              className="h-10 rounded bg-[var(--card-muted)] animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
  
        <div className="flex flex-col items-center justify-center py-10 text-center space-y-3">
          <div className="text-4xl">⚠️</div>
          <h3 className="text-lg font-semibold">Something went wrong</h3>
          <p className="text-sm text-[var(--muted-foreground)]">{error}</p>
          <button
            onClick={fetchRepos}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm text-white hover:opacity-90"
          >
            Try Again
          </button>
        </div>
      ) : repos.length === 0 ? (
      
        <div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
          <div className="text-4xl">📁</div>
          <h3 className="text-lg font-semibold">No repositories found</h3>
          <p className="text-sm text-[var(--muted-foreground)]">
            No GitHub activity detected for the last {days} days.
          </p>
        </div>
      ) : (
        
        <ul className="space-y-3">
          {repos.map((repo, idx) => {
            const barWidth = Math.max(
              Math.round((repo.commits / maxCommits) * 100),
              4
            );
            const shortName = repo.name.includes("/")
              ? repo.name.split("/")[1]
              : repo.name;

            return (
              <li key={repo.name}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <a
                    href={repo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="max-w-[70%] truncate text-[var(--card-foreground)] hover:text-[var(--accent)]"
                    title={repo.name}
                  >
                    <span className="mr-1 text-[var(--muted-foreground)]">
                      #{idx + 1}
                    </span>
                    {shortName}
                  </a>
                  <span className="text-[var(--muted-foreground)]">
                    {repo.commits} {repo.commits === 1 ? "commit" : "commits"}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-[var(--control)] overflow-hidden">
                  <div
                    className="h-full bg-[var(--accent)] transition-all duration-500"
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
