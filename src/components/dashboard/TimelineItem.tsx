"use client";

import React from "react";
import type { TimelineActivity } from "@/lib/timeline-formatter";
import { GitCommit, GitPullRequest, HelpCircle, CheckSquare, Star, Milestone, Sparkles } from "lucide-react";

interface TimelineItemProps {
  activity: TimelineActivity;
}

function getActivityBadge(type: TimelineActivity["type"], originalType?: string) {
  switch (type) {
    case "commit":
      return {
        label: "Commit",
        icon: <GitCommit size={13} className="text-emerald-500" />,
        className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
      };
    case "pr":
      return {
        label: "Pull Request",
        icon: <GitPullRequest size={13} className="text-violet-500" />,
        className: "bg-violet-500/10 text-violet-500 border-violet-500/20",
      };
    case "issue":
      return {
        label: originalType === "discussion" ? "Discussion" : "Issue",
        icon: <HelpCircle size={13} className="text-sky-500" />,
        className: "bg-sky-500/10 text-sky-500 border-sky-500/20",
      };
    case "review":
      return {
        label: "Review",
        icon: <CheckSquare size={13} className="text-amber-500" />,
        className: "bg-amber-500/10 text-amber-500 border-amber-500/20",
      };
    default:
      if (originalType === "release") {
        return {
          label: "Release",
          icon: <Milestone size={13} className="text-indigo-500" />,
          className: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
        };
      }
      if (originalType === "star") {
        return {
          label: "Star",
          icon: <Star size={13} className="text-yellow-500" />,
          className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
        };
      }
      return {
        label: "Event",
        icon: <Sparkles size={13} className="text-gray-500" />,
        className: "bg-gray-500/10 text-gray-400 border-gray-500/20",
      };
  }
}

export default function TimelineItem({ activity }: TimelineItemProps) {
  const originalType = activity.metadata?.originalType as string | undefined;
  const badge = getActivityBadge(activity.type, originalType);
  const date = new Date(activity.timestamp);
  const timeString = date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="group relative flex items-start gap-4 pb-6 last:pb-2">
      {/* Vertical line connector */}
      <div className="absolute left-[17px] top-[34px] bottom-0 w-0.5 bg-[var(--border)] group-last:hidden" />

      {/* Type-based Icon wrapper */}
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)] shadow-sm transition-colors group-hover:border-[var(--accent)]/50">
        {badge.icon}
      </div>

      {/* Main timeline item card */}
      <div className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--accent)]/30 hover:shadow-md">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${badge.className}`}
            >
              {badge.label}
            </span>
            <span className="text-xs text-[var(--muted-foreground)] font-medium">
              at {timeString}
            </span>
            <span className="text-xs text-[var(--muted-foreground)]">
              •
            </span>
            <span className="text-xs font-semibold text-[var(--foreground)] hover:underline">
              <a
                href={`https://github.com/${activity.repository}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {activity.repository}
              </a>
            </span>
          </div>

          <a
            href={activity.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-[var(--accent)] hover:underline inline-flex items-center gap-1"
          >
            View on GitHub
            <svg
              className="h-3 w-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        </div>

        <h4 className="mt-2 text-sm font-semibold text-[var(--foreground)] leading-snug">
          {activity.title}
        </h4>

        {!!activity.metadata?.subtitle && (
          <p className="mt-1 text-xs text-[var(--muted-foreground)] italic">
            {String(activity.metadata.subtitle)}
          </p>
        )}
      </div>
    </div>
  );
}
