"use client";

import { useCallback, useEffect, useState } from "react";

interface PinnedRepo {
  name: string;
  description: string | null;
  url: string;
  stargazerCount: number;
  forkCount: number;
  primaryLanguage: { name: string; color: string } | null;
}

export default function PinnedRepos() {
  const [pinnedRepos, setPinnedRepos] = useState<PinnedRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPinnedRepos = useCallback(() => {
    setLoading(true);
    setError(null);

    fetch("/api/metrics/pinned-repos")
      .then((r) => {
        if (!r.ok) throw new Error("API error");
        return r.json();
      })
      .then((data: { pinnedRepos?: PinnedRepo[] }) =>
        setPinnedRepos(data.pinnedRepos ?? [])
      )
      .catch(() =>
        setError("We couldn't load your pinned repositories right now. Please try again in a moment.")
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchPinnedRepos();
  }, [fetchPinnedRepos]);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-[var(--card-foreground)]">
        Pinned Repositories
      </h2>
      {loading ? (
        <div
          role="status"
          aria-live="polite"
          aria-busy="true"
          className="space-y-3"
        >
          <span className="sr-only">Loading pinned repositories</span>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              aria-hidden="true"
              className="h-24 rounded-lg bg-[var(--card-muted)] animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-[var(--destructive-muted-border)] bg-[var(--destructive-muted)] p-4 text-sm text-[var(--destructive)]">
          <p>{error}</p>
          <button
            type="button"
            onClick={fetchPinnedRepos}
            className="mt-3 rounded-md border border-[var(--destructive-muted-border)] px-3 py-1.5 text-xs font-medium text-[var(--destructive)] transition-colors hover:bg-[var(--destructive-muted)]"
          >
            Try again
          </button>
        </div>
      ) : pinnedRepos.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">
          No pinned repositories.{" "}
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-[var(--accent)]"
          >
            Pin some on GitHub
          </a>
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pinnedRepos.map((repo) => (
            <a
              key={repo.url}
              href={repo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col gap-2 rounded-lg border border-[var(--border)] bg-[var(--card-muted)] p-4 transition-colors hover:border-[var(--accent)]"
            >
              <span className="truncate text-sm font-semibold text-[var(--card-foreground)]">
                {repo.name}
              </span>

              <span className="line-clamp-2 flex-1 text-xs text-[var(--muted-foreground)]">
                {repo.description ?? "No description"}
              </span>

              <div className="flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
                {repo.primaryLanguage && (
                  <span className="flex items-center gap-1">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{
                        backgroundColor:
                          repo.primaryLanguage.color ?? "#8b949e",
                      }}
                    />
                    {repo.primaryLanguage.name}
                  </span>
                )}
                <span>⭐ {repo.stargazerCount}</span>
                <span>🍴 {repo.forkCount}</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
