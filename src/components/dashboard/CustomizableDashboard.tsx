"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  type DragEndEvent,
  type UniqueIdentifier,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  SortableContext,
} from "@dnd-kit/sortable";
import dynamic from "next/dynamic";
import LazyWidget from "@/components/LazyWidget";
import DiscussionsWidget from "@/components/DiscussionsWidget";
import CommunityMetrics from "@/components/CommunityMetrics";
import GoalTracker from "@/components/GoalTracker";
import StreakTracker from "@/components/StreakTracker";
import TopRepos from "@/components/TopRepos";
import PinnedReposWidget from "@/components/PinnedReposWidget";
import InactiveRepositoriesCard from "@/components/InactiveRepositoriesCard";
import LanguageBreakdown from "@/components/LanguageBreakdown";
import CIAnalytics from "@/components/CIAnalytics";
import IssueMetrics from "@/components/IssueMetrics";
import RepoAnalyticsExplorer from "@/components/repo-analytics/RepoAnalyticsExplorer";
import WeeklySummaryCard from "@/components/WeeklySummaryCard";
import { AIMentorWidget } from "@/components/AIMentorWidget";
import PersonalRecords from "@/components/PersonalRecords";
import LocalCodingTime from "@/components/LocalCodingTime";
import CodingTimeWidget from "@/components/CodingTimeWidget";
import RecentActivity from "@/components/RecentActivity";
import DailyNoteWidget from "@/components/DailyNoteWidget";
import WidgetErrorBoundary from "@/components/WidgetErrorBoundary";
import DashboardLayoutToolbar from "@/components/dashboard/DashboardLayoutToolbar";
import SortableDashboardWidget from "@/components/dashboard/SortableDashboardWidget";
import {
  DASHBOARD_LAYOUT_STORAGE_KEY,
  DASHBOARD_SECTION_LABELS,
  DASHBOARD_WIDGET_LABELS,
  DASHBOARD_SECTIONS,
  getDefaultDashboardLayout,
  hideWidget,
  moveWidget,
  normalizeDashboardLayout,
  resetDashboardLayout,
  showWidget,
  type DashboardLayoutPreference,
  type DashboardSectionId,
  type DashboardWidgetId,
} from "@/lib/dashboard-layout";

const SkeletonCard = () => (
  <div
    role="status"
    aria-busy="true"
    aria-live="polite"
    className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm"
  >
    <div className="h-6 w-48 bg-[var(--card-muted)] rounded mb-4 animate-pulse" />
    <div className="h-40 bg-[var(--card-muted)] rounded animate-pulse" />
  </div>
);

const ContributionGraphSkeleton = () => (
  <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
    <h2 className="text-lg font-semibold text-[var(--foreground)]">
      Your Commits
    </h2>
    <div className="mt-3 h-40 rounded bg-[var(--card-muted)] animate-pulse" />
  </div>
);

const PRMetricsSkeleton = () => (
  <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
    <h2 className="text-lg font-semibold text-[var(--card-foreground)]">
      PR Analytics
    </h2>
    <div className="mt-3 h-40 rounded bg-[var(--card-muted)] animate-pulse" />
  </div>
);

const CodingActivityInsightsCard = dynamic(
  () => import("@/components/CodingActivityInsightsCard"),
  { ssr: false, loading: () => <SkeletonCard /> },
);

const FriendComparison = dynamic(() => import("@/components/FriendComparison"), {
  ssr: false,
  loading: () => <SkeletonCard />,
});

const ActivityRingChart = dynamic(
  () => import("@/components/ActivityRingChart"),
  { ssr: false, loading: () => <SkeletonCard /> },
);

const ContributionGraph = dynamic(
  () => import("@/components/ContributionGraph"),
  { ssr: false, loading: () => <ContributionGraphSkeleton /> },
);

const ContributionHeatmap = dynamic(
  () => import("@/components/ContributionHeatmap"),
  { ssr: false, loading: () => <SkeletonCard /> },
);

const RepoContributionDistribution = dynamic(
  () => import("@/components/RepoContributionDistribution"),
  { ssr: false, loading: () => <SkeletonCard /> },
);

const PRMetrics = dynamic(() => import("@/components/PRMetrics"), {
  ssr: false,
  loading: () => <PRMetricsSkeleton />,
});

const PRBreakdownChart = dynamic(() => import("@/components/PRBreakdownChart"), {
  ssr: false,
  loading: () => <SkeletonCard />,
});

const CommitTimeChart = dynamic(() => import("@/components/CommitTimeChart"), {
  ssr: false,
  loading: () => <SkeletonCard />,
});

const PRReviewTrendChart = dynamic(
  () => import("@/components/PRReviewTrendChart"),
  { ssr: false, loading: () => <SkeletonCard /> },
);

const ProductiveHoursWidget = dynamic(
  () => import("@/components/ProductiveHoursWidget"),
  { ssr: false, loading: () => <SkeletonCard /> },
);

const SECTION_ANCHOR_IDS: Record<DashboardSectionId, string> = {
  overview: "overview",
  activity: "streaks",
  analytics: "pull-requests",
  goals: "goals",
};

const SECTION_ACCENT_CLASSES: Record<DashboardSectionId, string> = {
  overview: "bg-[var(--accent)] shadow-[0_0_15px_var(--accent)]",
  activity: "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]",
  analytics: "bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]",
  goals: "bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]",
};

const SECTION_GRID_CLASSES: Record<DashboardSectionId, string> = {
  overview: "grid grid-cols-1 xl:grid-cols-2 gap-6 w-full",
  activity: "grid grid-cols-1 xl:grid-cols-3 gap-6 w-full",
  analytics: "grid grid-cols-1 lg:grid-cols-2 gap-6 w-full",
  goals: "grid grid-cols-1 xl:grid-cols-3 gap-6 w-full",
};

const WIDGET_SPAN_CLASSES: Partial<Record<DashboardWidgetId, string>> = {
  "weekly-summary": "xl:col-span-2",
  "contribution-graph": "xl:col-span-2",
  "repo-analytics": "lg:col-span-2",
  "issue-metrics": "xl:col-span-2",
  "goal-tracker": "xl:col-span-2",
  "daily-note": "xl:col-span-2",
  "recent-activity": "xl:col-span-2",
};

const isDashboardWidgetId = (
  value: UniqueIdentifier,
): value is DashboardWidgetId =>
  typeof value === "string" &&
  Object.prototype.hasOwnProperty.call(DASHBOARD_WIDGET_LABELS, value);

const findWidgetSection = (
  layout: DashboardLayoutPreference,
  widgetId: DashboardWidgetId,
): DashboardSectionId | null => {
  for (const sectionId of DASHBOARD_SECTIONS) {
    if (layout.widgets[sectionId].includes(widgetId)) {
      return sectionId;
    }
  }

  return null;
};

const renderDashboardWidget = (widgetId: DashboardWidgetId): ReactNode => {
  switch (widgetId) {
    case "weekly-summary":
      return <WeeklySummaryCard />;

    case "personal-records":
      return <PersonalRecords />;

    case "ai-mentor":
      return <AIMentorWidget />;

    case "contribution-graph":
      return (
        <div className="w-full overflow-x-auto pb-2">
          <WidgetErrorBoundary>
            <ContributionGraph />
          </WidgetErrorBoundary>
        </div>
      );

    case "contribution-heatmap":
      return (
        <div className="w-full overflow-x-auto pb-2">
          <ContributionHeatmap />
        </div>
      );

    case "repo-contribution-distribution":
      return (
        <LazyWidget fallback={<SkeletonCard />}>
          <RepoContributionDistribution />
        </LazyWidget>
      );

    case "activity-ring":
      return (
        <LazyWidget fallback={<SkeletonCard />}>
          <ActivityRingChart />
        </LazyWidget>
      );

    case "coding-activity-insights":
      return (
        <LazyWidget fallback={<SkeletonCard />}>
          <CodingActivityInsightsCard />
        </LazyWidget>
      );

    case "streak-tracker":
      return <StreakTracker />;

    case "local-coding-time":
      return <LocalCodingTime />;

    case "coding-time":
      return <CodingTimeWidget />;

    case "commit-time":
      return (
        <LazyWidget fallback={<SkeletonCard />}>
          <CommitTimeChart />
        </LazyWidget>
      );

    case "productive-hours":
      return <ProductiveHoursWidget />;

    case "repo-analytics":
      return (
        <LazyWidget fallback={<SkeletonCard />}>
          <RepoAnalyticsExplorer />
        </LazyWidget>
      );

    case "pr-metrics":
      return <PRMetrics />;

    case "pr-breakdown":
      return (
        <LazyWidget fallback={<SkeletonCard />}>
          <PRBreakdownChart />
        </LazyWidget>
      );

    case "pr-review-trend":
      return (
        <LazyWidget fallback={<SkeletonCard />}>
          <PRReviewTrendChart />
        </LazyWidget>
      );

    case "discussions":
      return (
        <LazyWidget fallback={<SkeletonCard />}>
          <DiscussionsWidget />
        </LazyWidget>
      );

    case "community-metrics":
      return <CommunityMetrics />;

    case "pinned-repos":
      return (
        <LazyWidget fallback={<SkeletonCard />}>
          <PinnedReposWidget />
        </LazyWidget>
      );

    case "top-repos":
      return (
        <LazyWidget fallback={<SkeletonCard />}>
          <TopRepos />
        </LazyWidget>
      );

    case "inactive-repos":
      return (
        <LazyWidget fallback={<SkeletonCard />}>
          <InactiveRepositoriesCard />
        </LazyWidget>
      );

    case "issue-metrics":
      return (
        <LazyWidget fallback={<SkeletonCard />}>
          <IssueMetrics />
        </LazyWidget>
      );

    case "goal-tracker":
      return (
        <WidgetErrorBoundary>
          <GoalTracker />
        </WidgetErrorBoundary>
      );

    case "daily-note":
      return <DailyNoteWidget />;

    case "recent-activity":
      return (
        <LazyWidget fallback={<SkeletonCard />}>
          <RecentActivity />
        </LazyWidget>
      );

    case "ci-analytics":
      return (
        <LazyWidget fallback={<SkeletonCard />}>
          <CIAnalytics />
        </LazyWidget>
      );

    case "language-breakdown":
      return (
        <LazyWidget fallback={<SkeletonCard />}>
          <LanguageBreakdown />
        </LazyWidget>
      );

    case "friend-comparison":
      return (
        <LazyWidget fallback={<SkeletonCard />}>
          <FriendComparison />
        </LazyWidget>
      );

    default:
      return null;
  }
};

export default function CustomizableDashboard() {
  const [layout, setLayout] = useState<DashboardLayoutPreference>(() =>
    getDefaultDashboardLayout(),
  );
  const [isEditing, setIsEditing] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [hasLoadedRemoteLayout, setHasLoadedRemoteLayout] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    try {
      const savedLayout = window.localStorage.getItem(
        DASHBOARD_LAYOUT_STORAGE_KEY,
      );

      if (savedLayout) {
        setLayout(normalizeDashboardLayout(JSON.parse(savedLayout)));
      }
    } catch {
      setLayout(getDefaultDashboardLayout());
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
  let isMounted = true;

  const loadRemoteLayout = async () => {
    try {
      const response = await fetch("/api/user/dashboard-layout", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as { layout?: unknown };

      if (isMounted && data.layout) {
        setLayout(normalizeDashboardLayout(data.layout));
      }
    } catch {
      // Keep localStorage layout when remote sync is unavailable.
    } finally {
      if (isMounted) {
        setHasLoadedRemoteLayout(true);
      }
    }
  };

  loadRemoteLayout();

  return () => {
    isMounted = false;
  };
}, []);

  useEffect(() => {
    if (!isHydrated) return;

    window.localStorage.setItem(
      DASHBOARD_LAYOUT_STORAGE_KEY,
      JSON.stringify(layout),
    );
  }, [isHydrated, layout]);

  const visibleWidgetCount = useMemo(
    () =>
      DASHBOARD_SECTIONS.reduce(
        (count, sectionId) => count + layout.widgets[sectionId].length,
        0,
      ),
    [layout],
  );

  useEffect(() => {
  if (!isHydrated || !hasLoadedRemoteLayout) return;

  const controller = new AbortController();

  const timeoutId = window.setTimeout(() => {
    fetch("/api/user/dashboard-layout", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ layout }),
      signal: controller.signal,
    }).catch(() => {
      // Local persistence already succeeded; remote sync can retry later.
    });
  }, 700);

  return () => {
    window.clearTimeout(timeoutId);
    controller.abort();
  };
}, [hasLoadedRemoteLayout, isHydrated, layout]);

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
  if (!over || active.id === over.id) return;

  const activeWidgetId = active.id;
  const overWidgetId = over.id;

  if (
    !isDashboardWidgetId(activeWidgetId) ||
    !isDashboardWidgetId(overWidgetId)
  ) {
    return;
  }

  setLayout((currentLayout) => {
    const fromSection = findWidgetSection(currentLayout, activeWidgetId);
    const toSection = findWidgetSection(currentLayout, overWidgetId);

    if (!fromSection || !toSection) {
      return currentLayout;
    }

    const overIndex = currentLayout.widgets[toSection].indexOf(overWidgetId);

    return moveWidget(
      currentLayout,
      fromSection,
      toSection,
      activeWidgetId,
      overIndex,
    );
  });
};

  const handleHideWidget = (widgetId: DashboardWidgetId) => {
    setLayout((currentLayout) => hideWidget(currentLayout, widgetId));
  };

  const handleShowWidget = (widgetId: DashboardWidgetId) => {
    setLayout((currentLayout) => showWidget(currentLayout, widgetId));
  };

  const handleResetLayout = () => {
    setLayout(resetDashboardLayout());
  };

  return (
    <div className="mt-14">
      <DashboardLayoutToolbar
        isEditing={isEditing}
        hiddenWidgets={layout.hidden}
        onEditingChange={setIsEditing}
        onReset={handleResetLayout}
        onShowWidget={handleShowWidget}
      />

      <p className="sr-only" aria-live="polite">
        {isEditing
          ? `Layout editing enabled. ${visibleWidgetCount} widgets are visible.`
          : "Layout editing disabled."}
      </p>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        {layout.sections.map((sectionId) => {
          const sectionWidgets = layout.widgets[sectionId];

          return (
            <section
              key={sectionId}
              id={SECTION_ANCHOR_IDS[sectionId]}
              className={`space-y-6 scroll-mt-28 ${
                sectionId === "goals" ? "mb-12" : "mb-14"
              }`}
            >
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <div
                  className={`h-8 w-1.5 rounded-full ${SECTION_ACCENT_CLASSES[sectionId]}`}
                />
                <h2 className="text-2xl font-bold tracking-tight">
                  {DASHBOARD_SECTION_LABELS[sectionId]}
                </h2>
              </div>

              <SortableContext
                items={sectionWidgets}
                strategy={rectSortingStrategy}
              >
                <div className={SECTION_GRID_CLASSES[sectionId]}>
                  {sectionWidgets.map((widgetId) => (
                    <SortableDashboardWidget
                      key={widgetId}
                      id={widgetId}
                      title={DASHBOARD_WIDGET_LABELS[widgetId]}
                      isEditing={isEditing}
                      onHide={handleHideWidget}
                      className={WIDGET_SPAN_CLASSES[widgetId] ?? ""}
                    >
                      {renderDashboardWidget(widgetId)}
                    </SortableDashboardWidget>
                  ))}
                </div>
              </SortableContext>
            </section>
          );
        })}
      </DndContext>
    </div>
  );
}
