"use client";

import { useEffect, useRef, useState } from "react";

interface DailyBreakdownSheetProps {
  date: string | null;
  onClose: () => void;
  heatmapData?: Record<string, number>;
}

interface RepoCommit {
  repo: string;
  count: number;
  url: string;
}

export default function DailyBreakdownSheet({
  date,
  onClose,
  heatmapData,
}: DailyBreakdownSheetProps) {
  const [commits, setCommits] = useState<RepoCommit[]>([]);
  const [loading, setLoading] = useState(false);
  const isOpen = date !== null;

  useEffect(() => {
    if (!date) return;
    const totalForDay = heatmapData?.[date] ?? 0;
    if (totalForDay === 0) {
      setCommits([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/metrics/contributions/daily?date=${date}`)
    .then((res) => res.json())
    .then((result) => {
        setCommits(result.repos ?? []);
    })
      .catch(() => setCommits([]))
      .finally(() => setLoading(false));
  }, [date, heatmapData]);

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (!isOpen) return null;

  const formattedDate = date
    ? new Date(date + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "";

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Daily breakdown for ${formattedDate}`}
        className="fixed right-0 top-0 z-50 flex h-full w-80 flex-col border-l border-[var(--border)] bg-[var(--card)] shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] p-4">
          <div>
            <h2 className="font-semibold text-[var(--card-foreground)]">
              Daily Breakdown
            </h2>
            <p className="text-xs text-[var(--muted-foreground)]">
              {formattedDate}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="rounded p-1 text-[var(--muted-foreground)] hover:text-[var(--card-foreground)]"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-12 animate-pulse rounded-lg bg-[var(--card-muted)]"
                />
              ))}
            </div>
          ) : commits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-[var(--muted-foreground)]">
                No commit data available for this day.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {commits.map((item) => (
                  <a
                  key={item.repo}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-lg border border-[var(--border)] p-3 hover:bg-[var(--accent)]/10"
                >
                  <span className="truncate text-sm font-medium text-[var(--card-foreground)]">
                    {item.repo}
                  </span>
                  <span className="ml-2 shrink-0 rounded-full bg-[var(--accent)]/20 px-2 py-0.5 text-xs font-semibold text-[var(--accent-foreground)]">
                    {item.count} commit{item.count === 1 ? "" : "s"}
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
