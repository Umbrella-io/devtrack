"use client";

import { type ReactNode, useCallback, useEffect, useState } from "react";
import { useAccount } from "@/components/AccountContext";

type ActivityType =
  | "push"
  | "pull_request"
  | "issue"
  | "release"
  | "other";

interface ActivityItem {
  id: string;
  type: ActivityType;
  createdAt: string;
  title: string;
  subtitle: string;
  repo: string;
  url: string;
}

function getTypeBadge(type: ActivityType): string {
  if (type === "push") return "Push";
  if (type === "pull_request") return "PR";
  if (type === "issue") return "Issue";
  if (type === "release") return "Release";
  return "Event";
}

function getTypeIcon(type: ActivityType): ReactNode {
  if (type === "push") {
    return (
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
        <path
          d="M5 2v8M5 10l-2-2M5 10l2-2M11 14V6M11 6l-2 2M11 6l2 2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (type === "pull_request") {
    return (
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
        <path
          d="M4 3a1.5 1.5 0 1 1-3 0a1.5 1.5 0 0 1 3 0ZM4 13a1.5 1.5 0 1 1-3 0a1.5 1.5 0 0 1 3 0ZM10 3a1.5 1.5 0 1 1 3 0a1.5 1.5 0 0 1-3 0Z"
          fill="currentColor"
        />
        <path
          d="M2.5 4.5v7M4 3h4.5a2.5 2.5 0 0 1 2.5 2.5v0"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (type === "issue") {
    return (
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
        <circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="8" cy="5" r="1" fill="currentColor" />
        <path d="M8 7.5v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === "release") {
    return (
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
        <path
          d="M8 2l1.6 3.2L13 6l-2.5 2.4L11 12l-3-1.6L5 12l.5-3.6L3 6l3.4-.8L8 2Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return null;
}

function formatEventTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function RecentActivity() {
  const { selectedAccount } = useAccount();
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivity = useCallback(() => {
    setLoading(true);
    setError(null);

    const query =
      selectedAccount !== null
        ? `?accountId=${encodeURIComponent(selectedAccount)}`
        : "";

    fetch(`/api/metrics/activity${query}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error("API error");
        }
        return res.json();
      })
      .then((payload: { items?: ActivityItem[] }) =>
        setItems(payload.items ?? [])
      )
      .catch(() =>
        setError(
          "We couldn't load your recent activity right now. Please try again in a moment."
        )
      )
      .finally(() => setLoading(false));
  }, [selectedAccount]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--card-foreground)]">
            Recent Activity
          </h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Your latest GitHub events
          </p>
        </div>
        <button
          type="button"
          onClick={fetchActivity}
          className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--muted-foreground)] transition-colors hover:bg-[var(--control)]"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="max-h-[320px] space-y-3 overflow-y-auto pr-1">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-16 rounded-lg bg-[var(--card-muted)] animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-[var(--destructive)]/20 bg-[var(--destructive)]/10 p-4 text-sm text-[var(--destructive)]">
          <p>{error}</p>
          <button
            type="button"
            onClick={fetchActivity}
            className="mt-3 rounded-md border border-[var(--destructive)]/30 px-3 py-1.5 text-xs font-medium text-[var(--destructive)] transition-colors hover:bg-[var(--destructive)]/10"
          >
            Try again
          </button>
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--card-muted)] p-4 text-sm text-[var(--muted-foreground)]">
          No recent GitHub activity yet.
        </p>
      ) : (
        <ul className="max-h-[320px] space-y-3 overflow-y-auto border-l border-[var(--border)] pl-4 pr-1">
          {items.map((item) => (
            <li key={item.id} className="relative">
              <span
                aria-hidden="true"
                className="absolute -left-[21px] top-6 h-2.5 w-2.5 rounded-full border border-[var(--border)] bg-[var(--card)]"
              />
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg border border-[var(--border)] bg-[var(--control)] p-4 transition-colors hover:border-[var(--accent)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] px-2 py-0.5 text-xs font-medium text-[var(--muted-foreground)]">
                    {getTypeIcon(item.type)}
                    {getTypeBadge(item.type)}
                  </span>
                  <span
                    className="shrink-0 text-xs text-[var(--muted-foreground)]"
                    title={new Date(item.createdAt).toLocaleString()}
                  >
                    {formatEventTime(item.createdAt)}
                  </span>
                </div>
                <p className="mt-2 text-sm font-medium text-[var(--card-foreground)]">
                  {item.title}
                </p>
                <p className="mt-1 truncate text-xs text-[var(--muted-foreground)]">
                  {item.subtitle}
                </p>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

