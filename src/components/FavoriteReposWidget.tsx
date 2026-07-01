"use client";

import { useCallback, useEffect, useState } from "react";
import { useFavorites } from "@/hooks/useFavorites";
import RepoCard from "./repo-analytics/RepoCard";
import RepoAnalyticsSheet from "./repo-analytics/RepoAnalyticsSheet";
import { ExplorerRepoCardData } from "@/lib/repo-analytics-types";
import { Star } from "lucide-react";

export default function FavoriteReposWidget() {
  const { favorites, toggleFavorite } = useFavorites();
  const [repos, setRepos] = useState<ExplorerRepoCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<ExplorerRepoCardData | null>(null);

  const fetchRepos = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/metrics/repo-explorer")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch repositories");
        return res.json();
      })
      .then((json: { repos: ExplorerRepoCardData[] }) => {
        setRepos(json.repos ?? []);
      })
      .catch((err) => {
        console.error("Failed to fetch favorite repos details:", err);
        setError("Could not load repository details.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchRepos();
  }, [fetchRepos]);

  const favoriteRepos = repos.filter((repo) => favorites.includes(repo.fullName));

  if (loading) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-[var(--card-foreground)] flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
          <span>Favorite Repositories</span>
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-3xl bg-[var(--card-muted)]/50 border border-[var(--border)]" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-[var(--card-foreground)] flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
          <span>Favorite Repositories</span>
        </h2>
        <div className="rounded-xl border border-[var(--destructive-muted-border)] bg-[var(--destructive-muted)] p-5 text-sm text-[var(--destructive)] flex flex-col items-center justify-center text-center">
          <p className="font-medium mb-3">{error}</p>
          <button onClick={fetchRepos} className="rounded-xl border border-[var(--destructive-muted-border)] bg-transparent px-4 py-2 text-sm font-medium text-[var(--destructive)] transition-colors hover:bg-[var(--destructive)] hover:text-white">Try again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1">
      <h2 className="mb-4 text-lg font-semibold text-[var(--card-foreground)] flex items-center justify-between">
        <span className="flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
          <span>Favorite Repositories</span>
          {favoriteRepos.length > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-[var(--card-muted)] text-[var(--card-foreground)] font-normal">
              {favoriteRepos.length}
            </span>
          )}
        </span>
      </h2>

      {favoriteRepos.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[var(--border)] bg-[var(--card-muted)]/20 p-8 text-center">
          <div className="rounded-full bg-[var(--card)] p-4 shadow-sm mb-4 border border-[var(--border)] transition-all duration-300 hover:shadow-md hover:-translate-y-1">
            <Star className="w-8 h-8 text-[var(--muted-foreground)]" />
          </div>
          <h3 className="text-sm font-semibold text-[var(--card-foreground)] mb-1">
            No favorite repositories yet
          </h3>
          <p className="text-xs text-[var(--muted-foreground)] max-w-sm mx-auto">
            Click the star icon on any repository card in the Repo Analytics section to add it here.
          </p>
        </div>
      ) : (
        <div className="grid min-w-0 grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 relative mt-6">
          {favoriteRepos.map((repo, idx) => (
            <div
              key={repo.id}
              className="fade-up transition-all duration-500 hover:-translate-y-1.5"
              style={{ animationDelay: `${idx * 75}ms` }}
            >
              <RepoCard
                repo={repo}
                onViewAnalytics={setSelectedRepo}
                isFavorite={true}
                onToggleFavorite={toggleFavorite}
              />
            </div>
          ))}
        </div>
      )}

      <RepoAnalyticsSheet repoFullName={selectedRepo?.fullName ?? null} open={Boolean(selectedRepo)} onClose={() => setSelectedRepo(null)} />
    </div>
  );
}
