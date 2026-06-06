"use client";

import { Check, Eye, RotateCcw, SlidersHorizontal } from "lucide-react";
import {
  DASHBOARD_WIDGET_LABELS,
  type DashboardWidgetId,
} from "@/lib/dashboard-layout";

interface DashboardLayoutToolbarProps {
  isEditing: boolean;
  hiddenWidgets: DashboardWidgetId[];
  onEditingChange: (isEditing: boolean) => void;
  onReset: () => void;
  onShowWidget: (widgetId: DashboardWidgetId) => void;
}

export default function DashboardLayoutToolbar({
  isEditing,
  hiddenWidgets,
  onEditingChange,
  onReset,
  onShowWidget,
}: DashboardLayoutToolbarProps) {
  return (
    <div className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--card)]/80 p-4 shadow-sm backdrop-blur">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-[var(--foreground)]">
            Dashboard Layout
          </h2>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            Reorder widgets, hide unused cards, and reset the dashboard anytime.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isEditing ? (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--control)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Reset
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => onEditingChange(!isEditing)}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--accent)] bg-[var(--accent)]/10 px-4 py-2 text-sm font-semibold text-[var(--accent)] transition hover:bg-[var(--accent)]/20 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          >
            {isEditing ? (
              <>
                <Check className="h-4 w-4" aria-hidden="true" />
                Done
              </>
            ) : (
              <>
                <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                Edit Layout
              </>
            )}
          </button>
        </div>
      </div>

      {isEditing ? (
        <div className="mt-4 border-t border-[var(--border)] pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
            Hidden widgets
          </h3>

          {hiddenWidgets.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {hiddenWidgets.map((widgetId) => (
                <button
                  key={widgetId}
                  type="button"
                  onClick={() => onShowWidget(widgetId)}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--control)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                >
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  Show {DASHBOARD_WIDGET_LABELS[widgetId]}
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-[var(--muted-foreground)]">
              No widgets are hidden.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}