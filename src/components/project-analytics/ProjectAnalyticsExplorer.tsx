"use client";

import { useCallback, useEffect, useState } from "react";
import RepoGrid from "./RepoGrid";
import { ExplorerRepoCardData } from "@/lib/projectAnalytics";

export default function ProjectAnalyticsExplorer() {
  const [repos, setRepos] = useState<ExplorerRepoCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRepos = useCallback(() => {
    setLoading(true);
    setError(null);

    fetch("/api/metrics/project-explorer")
      .then((res) => {
        if (!res.ok) throw new Error("Failed");
        return res.json();
      })
      .then((json: { repos: ExplorerRepoCardData[] }) => setRepos(json.repos ?? []))
      .catch(() => setError("Could not load project analytics right now."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchRepos();
  }, [fetchRepos]);

  return (
    <section className="mt-6 min-w-0 overflow-hidden rounded-2xl border border-slate-700/70 bg-gradient-to-b from-slate-900 to-slate-950 p-4 shadow-2xl shadow-slate-950/30 md:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Project Analytics Explorer</h2>
          <p className="text-sm text-slate-400">Explore repository health, contributors, timeline and tech stack signals.</p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-64 animate-pulse rounded-2xl bg-slate-800/70" />)}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-300">
          <p>{error}</p>
          <button onClick={fetchRepos} className="mt-3 rounded-lg border border-rose-400/40 px-3 py-1.5 text-xs text-rose-200">Try again</button>
        </div>
      ) : (
        <RepoGrid repos={repos} />
      )}
    </section>
  );
}
