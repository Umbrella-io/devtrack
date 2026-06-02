"use client";

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
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (open) {
      setShouldRender(true);
    } else {
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

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

  if (!shouldRender && !open) return null;

  return (
    <>
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-300 ease-out ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        style={{ backgroundColor: "color-mix(in srgb, var(--card) 60%, transparent)" }}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-3xl overflow-y-auto border-l border-[var(--border)] bg-[var(--card)] p-4 sm:p-6 shadow-2xl shadow-black/60 transition-transform duration-300 ease-out flex flex-col`}
        style={{
          transform: open ? "translateX(0)" : "translateX(100%)",
        }}
      >
        <div className="mb-4 flex items-start justify-between gap-4 flex-shrink-0 w-full">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-lg font-semibold text-[var(--card-foreground)]">{repoFullName ?? "Repository Analytics"}</h3>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">Advanced insights and health tracking</p>
          </div>
          <button onClick={onClose} className="rounded-lg border border-[var(--border)] px-3 py-1 text-sm text-[var(--muted-foreground)] hover:bg-[var(--card-muted)] transition-colors">Close</button>
        </div>

        {loading ? <div className="space-y-3 flex-1">{[1, 2, 3, 4].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-[var(--card-muted)]/40 border border-[var(--border)]" />)}</div> : null}
        {error ? <div className="rounded-xl border border-[var(--error-border)] bg-[var(--error-bg)] p-3 text-sm text-[var(--error)] flex-1">{error}</div> : null}

        {!loading && data && (
          <div className="flex flex-col gap-6 w-full min-w-0 pb-8">
            <section
              className="rounded-xl border border-[var(--border)] p-4 w-full min-w-0"
              style={{ backgroundColor: "color-mix(in srgb, var(--card) 60%, transparent)" }}
            >
              <h4 className="mb-2 text-sm font-semibold text-[var(--card-foreground)]">Repository Overview</h4>
              <p className="mb-3 text-sm text-[var(--muted-foreground)] break-words">{data.overview.description ?? "No description"}</p>
              <div className="grid grid-cols-2 gap-2 text-xs text-[var(--muted-foreground)] xs:grid-cols-2 sm:grid-cols-3">
                <span className="truncate">Stars: {data.overview.stars}</span><span className="truncate">Forks: {data.overview.forks}</span><span className="truncate">Open issues: {data.overview.openIssues}</span>
                <span className="truncate">Watchers: {data.overview.watchers}</span><span className="truncate">License: {data.overview.license}</span><span className="truncate">Branch: {data.overview.defaultBranch}</span>
                <span className="truncate col-span-2 sm:col-span-1">Created: {formatDisplayDate(data.overview.createdAt)}</span><span className="truncate col-span-2 sm:col-span-1">Updated: {formatDisplayDate(data.overview.updatedAt)}</span>
              </div>
            </section>

            <section
              className="rounded-xl border border-[var(--border)] p-4 w-full min-w-0"
              style={{ backgroundColor: "color-mix(in srgb, var(--card) 60%, transparent)" }}
            >
              <h4 className="mb-3 text-sm font-semibold text-[var(--card-foreground)]">Contributor Analytics</h4>
              <div className="w-full block">
                <ContributorStats contributors={data.contributors} />
              </div>
            </section>

            {/* FIXED SECTION: Added explicit layout heights to support Recharts ResponsiveContainer on small screens */}
            <section
              className="rounded-xl border border-[var(--border)] p-4 w-full min-w-0 flex flex-col"
              style={{ backgroundColor: "color-mix(in srgb, var(--card) 60%, transparent)" }}
            >
              <h4 className="mb-3 text-sm font-semibold text-[var(--card-foreground)] flex-shrink-0">Timeline Analytics</h4>
              <div className="w-full block min-h-[440px] lg:min-h-[220px]">
                <RepoTimelineChart timeline={data.timeline} />
              </div>
            </section>

            <section
              className="rounded-xl border border-[var(--border)] p-4 w-full min-w-0"
              style={{ backgroundColor: "color-mix(in srgb, var(--card) 60%, transparent)" }}
            >
              <h4 className="mb-3 text-sm font-semibold text-[var(--card-foreground)]">Repository Health</h4>
              <div className="w-full block">
                <RepoHealthMetrics health={data.health} />
              </div>
            </section>

            <section
              className="rounded-xl border border-[var(--border)] p-4 w-full min-w-0"
              style={{ backgroundColor: "color-mix(in srgb, var(--card) 60%, transparent)" }}
            >
              <h4 className="mb-3 text-sm font-semibold text-[var(--card-foreground)]">Tech Stack Analytics</h4>
              <div className="mb-2 flex flex-wrap gap-2">{data.primaryStack.map((stack) => <span key={stack} className="rounded-full border border-[var(--border)] px-2 py-1 text-xs text-[var(--card-foreground)]">{stack}</span>)}</div>
              <div className="space-y-2">{data.languageBreakdown.map((language) => <div key={language.name} className="text-xs text-[var(--muted-foreground)]"><div className="mb-1 flex justify-between"><span>{language.name}</span><span>{language.percentage}%</span></div><div className="h-1.5 rounded-full bg-[var(--border)]"><div className="h-full rounded-full" style={{ width: `${language.percentage}%`, backgroundColor: language.color }} /></div></div>)}</div>
            </section>
          </div>
        )}
      </aside>
    </>
  );
}
