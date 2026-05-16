"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import ContributorStats from "./ContributorStats";
import RepoTimelineChart from "./RepoTimelineChart";
import RepoHealthMetrics from "./RepoHealthMetrics";
import { RepoAnalyticsResponse } from "@/lib/repoAnalytics";
import { formatDisplayDate } from "@/lib/repoAnalyticsUtils";

interface RepoAnalyticsSheetProps {
  repoFullName: string | null;
  open: boolean;
  onClose: () => void;
}

export default function RepoAnalyticsSheet({ repoFullName, open, onClose }: RepoAnalyticsSheetProps) {
  const [data, setData] = useState<RepoAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !repoFullName) return;
    setLoading(true);
    setError(null);
    fetch(`/api/metrics/repo-analytics?repo=${encodeURIComponent(repoFullName)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed");
        return res.json();
      })
      .then((json: RepoAnalyticsResponse) => setData(json))
      .catch(() => setError("Unable to load repository analytics right now."))
      .finally(() => setLoading(false));
  }, [open, repoFullName]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-slate-950/60" onClick={onClose} />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            className="fixed inset-y-0 right-0 z-50 w-full max-w-3xl overflow-y-auto border-l border-slate-700 bg-slate-900 p-5 shadow-2xl shadow-black/60 sm:p-6"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="truncate text-lg font-semibold text-slate-100">{repoFullName ?? "Repository Analytics"}</h3>
                <p className="mt-1 text-sm text-slate-400">Advanced insights and health tracking</p>
              </div>
              <button onClick={onClose} className="rounded-lg border border-slate-600 px-3 py-1 text-sm text-slate-300">Close</button>
            </div>

            {loading ? <div className="space-y-3">{[1, 2, 3, 4].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-800" />)}</div> : null}
            {error ? <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</div> : null}

            {!loading && data && (
              <div className="space-y-5">
                <section className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
                  <h4 className="mb-2 text-sm font-semibold text-slate-100">Repository Overview</h4>
                  <p className="mb-3 text-sm text-slate-400">{data.overview.description ?? "No description"}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 sm:grid-cols-3">
                    <span>Stars: {data.overview.stars}</span><span>Forks: {data.overview.forks}</span><span>Open issues: {data.overview.openIssues}</span>
                    <span>Watchers: {data.overview.watchers}</span><span>License: {data.overview.license}</span><span>Branch: {data.overview.defaultBranch}</span>
                    <span>Created: {formatDisplayDate(data.overview.createdAt)}</span><span>Updated: {formatDisplayDate(data.overview.updatedAt)}</span>
                  </div>
                </section>

                <section className="rounded-xl border border-slate-700 bg-slate-800/60 p-4"><h4 className="mb-3 text-sm font-semibold text-slate-100">Contributor Analytics</h4><ContributorStats contributors={data.contributors} /></section>
                <section className="rounded-xl border border-slate-700 bg-slate-800/60 p-4"><h4 className="mb-3 text-sm font-semibold text-slate-100">Timeline Analytics</h4><RepoTimelineChart timeline={data.timeline} /></section>
                <section className="rounded-xl border border-slate-700 bg-slate-800/60 p-4"><h4 className="mb-3 text-sm font-semibold text-slate-100">Repository Health</h4><RepoHealthMetrics health={data.health} /></section>
                <section className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
                  <h4 className="mb-3 text-sm font-semibold text-slate-100">Tech Stack Analytics</h4>
                  <div className="mb-2 flex flex-wrap gap-2">{data.primaryStack.map((stack) => <span key={stack} className="rounded-full border border-slate-600 px-2 py-1 text-xs text-slate-200">{stack}</span>)}</div>
                  <div className="space-y-2">{data.languageBreakdown.map((language) => <div key={language.name} className="text-xs text-slate-300"><div className="mb-1 flex justify-between"><span>{language.name}</span><span>{language.percentage}%</span></div><div className="h-1.5 rounded-full bg-slate-700"><div className="h-full rounded-full" style={{ width: `${language.percentage}%`, backgroundColor: language.color }} /></div></div>)}</div>
                </section>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
