"use client";

import React, { useEffect, useState } from "react";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  type DragEndEvent,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import CIAnalytics from "@/components/CIAnalytics";
import CommitTimeChart from "@/components/CommitTimeChart";
import ContributionGraph from "@/components/ContributionGraph";
import ContributionHeatmap from "@/components/ContributionHeatmap";
import FriendComparison from "@/components/FriendComparison";
import GoalTracker from "@/components/GoalTracker";
import IssueMetrics from "@/components/IssueMetrics";
import LanguageBreakdown from "@/components/LanguageBreakdown";
import PinnedRepos from "@/components/PinnedRepos";
import PRBreakdownChart from "@/components/PRBreakdownChart";
import PRMetrics from "@/components/PRMetrics";
import SortableWidget from "@/components/SortableWidget";
import StreakTracker from "@/components/StreakTracker";
import TopRepos from "@/components/TopRepos";
import WeeklySummaryCard from "@/components/WeeklySummaryCard";

// StreakAtRiskBanner, WeeklySummaryCard, and PersonalRecords are
// intentionally excluded - they are fixed layout elements, not
// user-rearrangeable widgets.
const DEFAULT_LAYOUT: string[] = [
  "weekly-summary-card",
  "contribution-graph",
  "contribution-heatmap",
  "streak-tracker",
  "friend-comparison",
  "pr-metrics",
  "pr-breakdown-chart",
  "commit-time-chart",
  "ci-analytics",
  "issue-metrics",
  "pinned-repos",
  "top-repos",
  "language-breakdown",
  "goal-tracker",
];

const widgetMap: Record<string, React.ComponentType> = {
  "weekly-summary-card": WeeklySummaryCard,
  "contribution-graph": ContributionGraph,
  "contribution-heatmap": ContributionHeatmap,
  "streak-tracker": StreakTracker,
  "friend-comparison": FriendComparison,
  "pr-metrics": PRMetrics,
  "pr-breakdown-chart": PRBreakdownChart,
  "commit-time-chart": CommitTimeChart,
  "ci-analytics": CIAnalytics,
  "issue-metrics": IssueMetrics,
  "pinned-repos": PinnedRepos,
  "top-repos": TopRepos,
  "language-breakdown": LanguageBreakdown,
  "goal-tracker": GoalTracker,
};

export default function DashboardClient() {
  const [layout, setLayout] = useState<string[]>(DEFAULT_LAYOUT);

  // NOTE: localStorage is intentionally read in useEffect per maintainer
  // review. SSR-safe cookie-based persistence is out of scope for v1.
  useEffect(() => {
    try {
      const stored = localStorage.getItem("dashboard-layout");
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.every((s) => typeof s === "string")) {
          const validIds = Object.keys(widgetMap);
          const filtered = parsed.filter(
            (s: string) => validIds.includes(s)
          );
          if (filtered.length > 0) {
            setLayout(filtered);
          }
        }
      }
    } catch { /* ignore */ }
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    })
  );

  function resetLayout() {
    localStorage.removeItem("dashboard-layout");
    setLayout(DEFAULT_LAYOUT);
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setLayout((currentLayout) => {
        const oldIndex = currentLayout.indexOf(String(active.id));
        const newIndex = currentLayout.indexOf(String(over?.id));

        if (oldIndex === -1 || newIndex === -1) {
          return currentLayout;
        }

        const newLayout = arrayMove(currentLayout, oldIndex, newIndex);
        localStorage.setItem("dashboard-layout", JSON.stringify(newLayout));
        return newLayout;
      });
    }
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <button
          type="button"
          onClick={resetLayout}
          className="text-sm px-3 py-1 rounded-md border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--card-foreground)] hover:border-[var(--card-foreground)] transition-colors"
        >
          Reset layout
        </button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <DndContext
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
          sensors={sensors}
        >
          <SortableContext
            items={layout}
            strategy={rectSortingStrategy}
          >
            {layout.filter((id) => id in widgetMap).map((id) => {
              const Widget = widgetMap[id];
              return (
                <SortableWidget key={id} id={id}>
                  <Widget />
                </SortableWidget>
              );
            })}
          </SortableContext>
        </DndContext>
      </div>
    </>
  );
}
