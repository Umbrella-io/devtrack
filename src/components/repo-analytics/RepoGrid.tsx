"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import RepoCard from "./RepoCard";
import RepoAnalyticsSheet from "./RepoAnalyticsSheet";
import { ExplorerRepoCardData } from "@/lib/repoAnalytics";

export default function RepoGrid({ repos }: { repos: ExplorerRepoCardData[] }) {
  const PAGE_SIZE = 6;
  const [query, setQuery] = useState("");
  const [languageFilter, setLanguageFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"activity" | "updated">("activity");
  const [selectedRepo, setSelectedRepo] = useState<ExplorerRepoCardData | null>(null);
  const [page, setPage] = useState(1);

  const languages = useMemo(() => ["all", ...Array.from(new Set(repos.map((r) => r.primaryLanguage).filter(Boolean) as string[]))], [repos]);

  const filteredRepos = useMemo(() => {
    return repos
      .filter((repo) => repo.name.toLowerCase().includes(query.toLowerCase()) || repo.fullName.toLowerCase().includes(query.toLowerCase()))
      .filter((repo) => languageFilter === "all" || repo.primaryLanguage === languageFilter)
      .sort((a, b) => sortBy === "activity" ? b.commitCount - a.commitCount : new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [repos, query, languageFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredRepos.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRepos = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredRepos.slice(start, start + PAGE_SIZE);
  }, [filteredRepos, safePage]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1 md:flex-row md:items-center">
        <input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Search repositories..." className="w-full rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-400 md:max-w-xs" />
        <div className="flex flex-1 flex-wrap gap-2">
          <select value={languageFilter} onChange={(e) => { setLanguageFilter(e.target.value); setPage(1); }} className="rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-200">
            {languages.map((language) => <option key={language} value={language}>{language === "all" ? "All languages" : language}</option>)}
          </select>
          <select value={sortBy} onChange={(e) => { setSortBy(e.target.value as "activity" | "updated"); setPage(1); }} className="rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-200">
            <option value="activity">Sort by activity</option>
            <option value="updated">Sort by updated</option>
          </select>
        </div>
      </div>

      {filteredRepos.length === 0 ? (
        <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-6 text-center text-sm text-slate-400">No repositories found for this filter.</div>
      ) : (
        <motion.div initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.05 } } }} className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {pageRepos.map((repo) => <RepoCard key={repo.id} repo={repo} onViewAnalytics={setSelectedRepo} />)}
        </motion.div>
      )}

      {filteredRepos.length > PAGE_SIZE && (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-xs text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-xs text-slate-400">
            Page {safePage} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-xs text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      <RepoAnalyticsSheet repoFullName={selectedRepo?.fullName ?? null} open={Boolean(selectedRepo)} onClose={() => setSelectedRepo(null)} />
    </div>
  );
}
