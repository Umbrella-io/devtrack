"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAccount } from "@/components/AccountContext";
import { RefreshCw, Calendar, Eye, Layers } from "lucide-react";
import type { TimelineActivity, DateRangeState } from "@/lib/timeline-formatter";
import {
  transformActivityItemToTimeline,
  filterActivities,
  groupActivities,
} from "@/lib/timeline-formatter";
import type { ActivityItem } from "@/lib/activity-formatter";
import TimelineFilterControls from "./TimelineFilterControls";
import TimelineDateRangeControls from "./TimelineDateRangeControls";
import TimelineViewControls from "./TimelineViewControls";
import TimelineItem from "./TimelineItem";

export default function TimelineContainer() {
  const { selectedAccount } = useAccount();
  const [rawActivities, setRawActivities] = useState<TimelineActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  
  const offsetRef = useRef(0);
  const LIMIT = 20;

  // Filter States
  const [activeFilter, setActiveFilter] = useState<"all" | "commit" | "pr" | "issue" | "review">("all");
  const [dateRange, setDateRange] = useState<DateRangeState>({ preset: "30" });
  const [activeView, setActiveView] = useState<"daily" | "weekly" | "monthly">("daily");

  const fetchActivities = useCallback((isLoadMore = false) => {
    if (isLoadMore) {
      setIsLoadingMore(true);
    } else {
      setLoading(true);
      offsetRef.current = 0;
    }
    setError(null);

    const previousOffset = offsetRef.current;
    const currentOffset = isLoadMore ? previousOffset + LIMIT : 0;
    offsetRef.current = currentOffset;

    let queryParams = `?limit=${LIMIT}&offset=${currentOffset}`;
    if (selectedAccount !== null) {
      queryParams += `&accountId=${encodeURIComponent(selectedAccount)}`;
    }

    fetch(`/api/metrics/activity${queryParams}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error("Unable to fetch activities");
        }
        return res.json();
      })
      .then((payload: { items?: ActivityItem[] }) => {
        const fetched = (payload.items ?? []).map(transformActivityItemToTimeline);
        if (isLoadMore) {
          setRawActivities((prev) => [...prev, ...fetched]);
        } else {
          setRawActivities(fetched);
        }
        setHasMore(fetched.length === LIMIT);
      })
      .catch(() => {
        offsetRef.current = previousOffset;
        setError("Failed to fetch activity timeline data. Please try again.");
      })
      .finally(() => {
        setLoading(false);
        setIsLoadingMore(false);
      });
  }, [selectedAccount]);

  useEffect(() => {
    fetchActivities(false);
  }, [fetchActivities]);

  // Client side filtering based on selections
  const filteredActivities = useMemo(() => {
    return filterActivities(rawActivities, activeFilter, dateRange);
  }, [rawActivities, activeFilter, dateRange]);

  // Client side grouping (daily, weekly, monthly)
  const groupedActivities = useMemo(() => {
    return groupActivities(filteredActivities, activeView);
  }, [filteredActivities, activeView]);

  return (
    <div className="space-y-6">
      {/* Filters card */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <Layers size={15} className="text-[var(--accent)]" />
            <span className="text-sm font-semibold text-[var(--foreground)]">Activity Type</span>
          </div>
          <TimelineFilterControls activeFilter={activeFilter} onChange={setActiveFilter} />
        </div>

        <div className="h-px bg-[var(--border)]" />

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <Calendar size={15} className="text-[var(--accent)]" />
            <span className="text-sm font-semibold text-[var(--foreground)]">Time Period</span>
          </div>
          <TimelineDateRangeControls value={dateRange} onChange={setDateRange} />
        </div>

        <div className="h-px bg-[var(--border)]" />

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <Eye size={15} className="text-[var(--accent)]" />
            <span className="text-sm font-semibold text-[var(--foreground)]">Grouping Interval</span>
          </div>
          <TimelineViewControls activeView={activeView} onChange={setActiveView} />
        </div>
      </div>

      {/* Main timeline listing */}
      {loading && !isLoadingMore ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="h-28 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 animate-pulse">
              <div className="h-4 w-40 rounded bg-[var(--border)] mb-2" />
              <div className="h-3 w-64 rounded bg-[var(--border)]" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-[var(--destructive)]/20 bg-[var(--destructive)]/5 p-6 text-center space-y-3">
          <p className="text-sm text-[var(--destructive)] font-medium">{error}</p>
          <button
            type="button"
            onClick={() => fetchActivities(false)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--destructive)]/10 px-4 py-2 text-xs font-semibold text-[var(--destructive)] transition hover:bg-[var(--destructive)]/20"
          >
            <RefreshCw size={13} />
            Try Again
          </button>
        </div>
      ) : Object.keys(groupedActivities).length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--card-muted)] p-12 text-center">
          <HelpCircleIcon className="mx-auto h-12 w-12 text-[var(--muted-foreground)] opacity-60" />
          <h3 className="mt-4 text-sm font-semibold text-[var(--foreground)]">No matching activities</h3>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            Try adjusting your filters, date ranges, or load more events from GitHub.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedActivities).map(([groupTitle, list]) => (
            <div key={groupTitle} className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)] border-b border-[var(--border)] pb-2 flex items-center gap-2">
                <span>{groupTitle}</span>
                <span className="rounded-full bg-[var(--border)] px-2 py-0.5 text-[10px] font-semibold text-[var(--foreground)]">
                  {list.length}
                </span>
              </h3>
              <div className="pl-2">
                {list.map((act) => (
                  <TimelineItem key={act.id} activity={act} />
                ))}
              </div>
            </div>
          ))}

          {/* Pagination controls */}
          {hasMore && (
            <div className="text-center pt-4">
              <button
                type="button"
                onClick={() => fetchActivities(true)}
                disabled={isLoadingMore}
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-5 py-2.5 text-xs font-semibold text-[var(--foreground)] shadow-sm transition hover:bg-[var(--control)] disabled:opacity-50"
              >
                {isLoadingMore ? (
                  <svg className="animate-spin h-4 w-4 text-[var(--muted-foreground)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : null}
                {isLoadingMore ? "Loading more..." : "Load More Activities"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function HelpCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
