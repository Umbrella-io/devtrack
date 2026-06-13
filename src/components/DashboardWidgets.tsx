"use client";

import Link from "next/link";
import { memo } from "react";

import ContributionGraph from "@/components/ContributionGraph";
import ContributionHeatmap from "@/components/ContributionHeatmap";
import PRMetrics from "@/components/PRMetrics";
import PRBreakdownChart from "@/components/PRBreakdownChart";
import GoalTracker from "@/components/GoalTracker";
import DashboardHeader from "@/components/DashboardHeader";
import StreakTracker from "@/components/StreakTracker";
import TopRepos from "@/components/TopRepos";
import PinnedRepos from "@/components/PinnedRepos";
import LanguageBreakdown from "@/components/LanguageBreakdown";
import CommitTimeChart from "@/components/CommitTimeChart";
import IssueMetrics from "@/components/IssueMetrics";
import StreakAtRiskBanner from "@/components/StreakAtRiskBanner";
import FriendComparison from "@/components/FriendComparison";
import WeeklySummaryCard from "@/components/WeeklySummaryCard";
import ExportButton from "@/components/ExportButton";
import PersonalRecords from "@/components/PersonalRecords";
import WidgetErrorBoundary from "@/components/WidgetErrorBoundary";
import LazyWidget from "@/components/LazyWidget";
import Skeleton from "@/components/Skeleton";

function DashboardWidgets() { return (
  <>
  <WidgetErrorBoundary>
  <DashboardHeader />
  </WidgetErrorBoundary>WidgetErrorBoundary>
  
  <div className="mb-6 flex justify-end gap-3">
  <WidgetErrorBoundary>
  <Link
    href="/dashboard/settings"
    className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm transition-colors hover:bg-[var(--card-muted)]"
    >
  Settings
  </Link>Link>
  </WidgetErrorBoundary>WidgetErrorBoundary>
  
  <WidgetErrorBoundary>
  <ExportButton />
  </WidgetErrorBoundary>WidgetErrorBoundary>
  </div>div>
  
  <WidgetErrorBoundary>
  <StreakAtRiskBanner />
  </WidgetErrorBoundary>WidgetErrorBoundary>
  
  <WidgetErrorBoundary>
  <WeeklySummaryCard />
  </WidgetErrorBoundary>WidgetErrorBoundary>
  
  <div className="mb-6">
  <WidgetErrorBoundary>
  <PersonalRecords />
  </WidgetErrorBoundary>WidgetErrorBoundary>
  </div>div>
  
    {/* Row 1 */}
  <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
  <div className="lg:col-span-2">
  <WidgetErrorBoundary>
  <ContributionGraph />
  </WidgetErrorBoundary>WidgetErrorBoundary>
  
  <div className="mt-6">
  <WidgetErrorBoundary>
  <ContributionHeatmap />
  </WidgetErrorBoundary>WidgetErrorBoundary>
  </div>div>
  </div>div>
  
  <div className="flex flex-col gap-6">
  <WidgetErrorBoundary>
  <StreakTracker />
  </WidgetErrorBoundary>WidgetErrorBoundary>
  
  <WidgetErrorBoundary>
  <FriendComparison />
  </WidgetErrorBoundary>WidgetErrorBoundary>
  </div>div>
  </div>div>
  
    {/* Row 2 */}
  <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
  <WidgetErrorBoundary>
  <PRMetrics />
  </WidgetErrorBoundary>WidgetErrorBoundary>
  
  <WidgetErrorBoundary>
  <PRBreakdownChart />
  </WidgetErrorBoundary>WidgetErrorBoundary>
  
  <WidgetErrorBoundary>
  <CommitTimeChart />
  </WidgetErrorBoundary>WidgetErrorBoundary>
  </div>div>
  
    {/* Row 3 — lazy loaded */}
  <div className="mt-6">
  <LazyWidget fallback={<Skeleton className="h-48 w-full rounded-xl" />}>
  <WidgetErrorBoundary>
  <IssueMetrics />
  </WidgetErrorBoundary>WidgetErrorBoundary>
  </LazyWidget>LazyWidget>
  </div>div>
  
    {/* Row 4 — lazy loaded */}
  <div className="mt-6">
  <LazyWidget fallback={<Skeleton className="h-48 w-full rounded-xl" />}>
  <WidgetErrorBoundary>
  <PinnedRepos />
  </WidgetErrorBoundary>WidgetErrorBoundary>
  </LazyWidget>LazyWidget>
  </div>div>
  
    {/* Row 5 — lazy loaded */}
  <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
  <LazyWidget fallback={<Skeleton className="h-48 w-full rounded-xl" />}>
  <WidgetErrorBoundary>
  <TopRepos />
  </WidgetErrorBoundary>WidgetErrorBoundary>
  </LazyWidget>LazyWidget>
  
  <LazyWidget fallback={<Skeleton className="h-48 w-full rounded-xl" />}>
  <WidgetErrorBoundary>
  <LanguageBreakdown />
  </WidgetErrorBoundary>WidgetErrorBoundary>
  </LazyWidget>LazyWidget>
  
  <LazyWidget fallback={<Skeleton className="h-48 w-full rounded-xl" />}>
  <WidgetErrorBoundary>
  <GoalTracker />
  </WidgetErrorBoundary>WidgetErrorBoundary>
  </LazyWidget>LazyWidget>
  </div>div>
  </>>
  );}

export default memo(DashboardWidgets);</>
