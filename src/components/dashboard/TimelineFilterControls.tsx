"use client";

import React from "react";

type FilterType = "all" | "commit" | "pr" | "issue" | "review";

interface TimelineFilterControlsProps {
  activeFilter: FilterType;
  onChange: (filter: FilterType) => void;
}

export default function TimelineFilterControls({
  activeFilter,
  onChange,
}: TimelineFilterControlsProps) {
  const options: { value: FilterType; label: string }[] = [
    { value: "all", label: "All Activities" },
    { value: "commit", label: "Commits" },
    { value: "pr", label: "Pull Requests" },
    { value: "issue", label: "Issues & Discussions" },
    { value: "review", label: "Reviews" },
  ];

  return (
    <div className="flex flex-wrap gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] p-1">
      {options.map((opt) => {
        const isActive = activeFilter === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all ${
              isActive
                ? "bg-[var(--accent)] text-white shadow-sm"
                : "text-[var(--muted-foreground)] hover:bg-[var(--control)] hover:text-[var(--foreground)]"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
