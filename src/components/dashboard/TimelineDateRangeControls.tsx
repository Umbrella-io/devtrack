"use client";

import React from "react";
import type { DateRangeState } from "@/lib/timeline-formatter";

interface TimelineDateRangeControlsProps {
  value: DateRangeState;
  onChange: (value: DateRangeState) => void;
}

export default function TimelineDateRangeControls({
  value,
  onChange,
}: TimelineDateRangeControlsProps) {
  const presets: { value: DateRangeState["preset"]; label: string }[] = [
    { value: "7", label: "Last 7 days" },
    { value: "30", label: "Last 30 days" },
    { value: "90", label: "Last 90 days" },
    { value: "custom", label: "Custom range" },
  ];

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="flex flex-wrap gap-1">
        {presets.map((preset) => {
          const isActive = value.preset === preset.value;
          return (
            <button
              key={preset.value}
              type="button"
              onClick={() => {
                onChange({
                  preset: preset.value,
                  startDate: preset.value === "custom" ? value.startDate || "" : undefined,
                  endDate: preset.value === "custom" ? value.endDate || "" : undefined,
                });
              }}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                isActive
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:bg-[var(--control)] hover:text-[var(--foreground)]"
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {value.preset === "custom" && (
        <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] p-1.5 animate-in fade-in-50 duration-200">
          <input
            type="date"
            aria-label="Start date"
            value={value.startDate ?? ""}
            onChange={(e) =>
              onChange({
                ...value,
                startDate: e.target.value,
              })
            }
            className="bg-transparent text-xs text-[var(--foreground)] focus:outline-none"
          />
          <span className="text-xs text-[var(--muted-foreground)]">to</span>
          <input
            type="date"
            aria-label="End date"
            value={value.endDate ?? ""}
            onChange={(e) =>
              onChange({
                ...value,
                endDate: e.target.value,
              })
            }
            className="bg-transparent text-xs text-[var(--foreground)] focus:outline-none"
          />
        </div>
      )}
    </div>
  );
}
