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

function DashboardWidgets() { return (
    <>
      <WidgetErrorBoundary>
        <DashboardHeader />
      </WidgetErrorBoundary>

      <div className="mb-6 flex justify-end gap-3">
        <WidgetErrorBoundary>
          <Link
            href="/dashboard/settings"
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm transition-colors hover:bg-[var(--card-muted)]"
          >
            Settings
          </Link>
        </WidgetErrorBoundary>

        <WidgetErrorBoundary>
          <ExportButton />
        </WidgetErrorBoundary>
      </div>

      <WidgetErrorBoundary>
        <StreakAtRiskBanner />
      </WidgetErrorBoundary>

      <WidgetErrorBoundary>
        <WeeklySummaryCard />
      </WidgetErrorBoundary>

      <div className="mb-6">
        <WidgetErrorBoundary>
          <PersonalRecords />
        </WidgetErrorBoundary>
      </div>

      {/* Row 1 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <WidgetErrorBoundary>
            <ContributionGraph />
          </WidgetErrorBoundary>

          <div className="mt-6">
            <WidgetErrorBoundary>
              <ContributionHeatmap />
            </WidgetErrorBoundary>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <WidgetErrorBoundary>
            <StreakTracker />
          </WidgetErrorBoundary>

          <WidgetErrorBoundary>
            <FriendComparison />
          </WidgetErrorBoundary>
        </div>
      </div>

      {/* Row 2 */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <WidgetErrorBoundary>
          <PRMetrics />
        </WidgetErrorBoundary>

        <WidgetErrorBoundary>
          <PRBreakdownChart />
        </WidgetErrorBoundary>

        <WidgetErrorBoundary>
          <CommitTimeChart />
        </WidgetErrorBoundary>
      </div>

      {/* Row 3 */}
      <div className="mt-6">
        <WidgetErrorBoundary>
          <IssueMetrics />
        </WidgetErrorBoundary>
      </div>

      

      {/* Row 4 */}
      <div className="mt-6">
        <WidgetErrorBoundary>
          <PinnedRepos />
        </WidgetErrorBoundary>
      </div>

      {/* Row 5 */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <WidgetErrorBoundary>
          <TopRepos />
        </WidgetErrorBoundary>

        <WidgetErrorBoundary>
          <LanguageBreakdown />
        </WidgetErrorBoundary>

        <WidgetErrorBoundary>
          <GoalTracker />
        </WidgetErrorBoundary>
      </div>
    </>
  );
}

export default memo(DashboardWidgets);
