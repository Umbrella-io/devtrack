"use client";

import React from "react";

type ViewType = "daily" | "weekly" | "monthly";

interface TimelineViewControlsProps {
  activeView: ViewType;
  onChange: (view: ViewType) => void;
}

export default function TimelineViewControls({
  activeView,
  onChange,
}: TimelineViewControlsProps) {
  const options: { value: ViewType; label: string }[] = [
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" },
  ];

  return (
    <div className="flex rounded-lg border border-[var(--border)] bg-[var(--card)] p-1">
      {options.map((opt) => {
        const isActive = activeView === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
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
