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
    <div className="mb-6 min-w-0 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]/50 p-4 shadow-sm backdrop-blur-sm transition-shadow duration-300 hover:shadow-md sm:mb-8 sm:p-6">
      <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 space-y-1">
          <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--foreground)]">
            <SlidersHorizontal
              className="h-5 w-5 shrink-0 text-[var(--accent)]"
              aria-hidden="true"
            />
            <span className="min-w-0 leading-tight">Customize Your Dashboard</span>
          </h2>
          <p className="max-w-3xl text-sm leading-relaxed text-[var(--muted-foreground)]">
            Reorder widgets by dragging, hide cards you don&apos;t need, and reset
            to default anytime.
          </p>
        </div>

        <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-2 md:flex md:flex-wrap md:items-center md:justify-end">
          {isEditing ? (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm font-medium text-[var(--foreground)] transition-all hover:bg-[var(--card)]/80 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] active:scale-95 sm:w-auto sm:px-4"
            >
              <RotateCcw className="h-4 w-4 shrink-0" aria-hidden="true" />
              Reset Layout
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => onEditingChange(!isEditing)}
            className="inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-[var(--accent)] bg-[var(--accent)]/10 px-3 py-2.5 text-sm font-semibold text-[var(--accent)] transition-all hover:bg-[var(--accent)]/20 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] active:scale-95 sm:w-auto sm:px-4"
          >
            {isEditing ? (
              <>
                <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
                Done Editing
              </>
            ) : (
              <>
                <SlidersHorizontal
                  className="h-4 w-4 shrink-0"
                  aria-hidden="true"
                />
                Edit Layout
              </>
            )}
          </button>
        </div>
      </div>

      {isEditing ? (
        <div className="mt-5 space-y-3 border-t border-[var(--border)] pt-5 sm:mt-6 sm:pt-6">
          <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            <Eye className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Hidden Widgets ({hiddenWidgets.length})
          </h3>

          {hiddenWidgets.length > 0 ? (
            <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
              {hiddenWidgets.map((widgetId) => (
                <button
                  key={widgetId}
                  type="button"
                  onClick={() => onShowWidget(widgetId)}
                  className="inline-flex min-w-0 items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)]/70 px-3 py-2 text-xs font-medium text-[var(--foreground)] transition-all hover:border-[var(--accent)]/50 hover:bg-[var(--accent)]/20 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] active:scale-95 sm:w-auto sm:max-w-full"
                  title={`Click to show ${DASHBOARD_WIDGET_LABELS[widgetId]}`}
                >
                  <Eye className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">
                    Show {DASHBOARD_WIDGET_LABELS[widgetId]}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="rounded-lg bg-[var(--card)]/30 px-3 py-2 text-xs italic text-[var(--muted-foreground)]">
              ✓ All widgets are visible. No hidden widgets to restore.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
