"use client";

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

export default function DashboardWidgets() {
  return (
    <>
      <WidgetErrorBoundary>
        <DashboardHeader />
      </WidgetErrorBoundary>

      <div className="mb-6 flex justify-end">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
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

      <div className="mt-6">
        <WidgetErrorBoundary>
          <IssueMetrics />
        </WidgetErrorBoundary>
      </div>

      <div className="mt-6">
        <WidgetErrorBoundary>
          <PinnedRepos />
        </WidgetErrorBoundary>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
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