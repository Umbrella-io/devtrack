import DiscussionsWidget from "@/components/DiscussionsWidget";
import ActivityRingChart from "@/components/ActivityRingChart";
import ContributionGraph from "@/components/ContributionGraph";
import ContributionHeatmap from "@/components/ContributionHeatmap";
import PRMetrics from "@/components/PRMetrics";
import CommunityMetrics from "@/components/CommunityMetrics";
import PRBreakdownChart from "@/components/PRBreakdownChart";
import GoalTracker from "@/components/GoalTracker";
import DashboardHeader from "@/components/DashboardHeader";
import StreakTracker from "@/components/StreakTracker";
import TopRepos from "@/components/TopRepos";
import PinnedRepos from "@/components/PinnedRepos";
import InactiveRepositoriesCard from "@/components/InactiveRepositoriesCard";
import LanguageBreakdown from "@/components/LanguageBreakdown";
import CommitTimeChart from "@/components/CommitTimeChart";
import CodingActivityInsightsCard from "@/components/CodingActivityInsightsCard";
import PRReviewTrendChart from "@/components/PRReviewTrendChart";
import CIAnalytics from "@/components/CIAnalytics";
import IssueMetrics from "@/components/IssueMetrics";
import StreakAtRiskBanner from "@/components/StreakAtRiskBanner";
import FriendComparison from "@/components/FriendComparison";
import WeeklySummaryCard from "@/components/WeeklySummaryCard";
import { AIMentorWidget } from "@/components/AIMentorWidget";
import ExportButton from "@/components/ExportButton";
import Link from "next/link";
import PersonalRecords from "@/components/PersonalRecords";
import LocalCodingTime from "@/components/LocalCodingTime";
import RecentActivity from "@/components/RecentActivity";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import DashboardSidebar from "@/components/DashboardSidebar";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/");

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] transition-colors">
      <div className="flex items-start min-h-screen">
        <DashboardSidebar />
        <div className="flex-1 p-4 md:p-8">
          <DashboardHeader />
          <div className="mb-6 flex justify-end items-center gap-2">
            <Link
              href="/dashboard/settings"
              className="rounded-lg border border-[var(--border)] bg-[var(--control)] px-4 py-2 text-sm text-[var(--foreground)] hover:opacity-90 transition-opacity min-w-[140px] flex items-center justify-center"
            >
              Settings
            </Link>
            <ExportButton />
          </div>
          <StreakAtRiskBanner />

          <div id="weekly-summary" className="mb-6">
            <WeeklySummaryCard />
          </div>

          <div id="ai-mentor" className="mb-6">
            <AIMentorWidget />
          </div>

          <div id="personal-records" className="mb-6">
            <PersonalRecords />
          </div>
          <div
            id="contribution"
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            <div className="lg:col-span-2">
              <ContributionGraph />
              <div className="mt-6">
                <ContributionHeatmap />
              </div>
              <div className="mt-6">
                <FriendComparison />
              </div>
            </div>

            <div id="streak">
              <StreakTracker />
              <LocalCodingTime />
            </div>
          </div>
          <div
            id="pr-analytics"
            className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6"
          >
            <PRMetrics />
            <CommunityMetrics />
            <PRBreakdownChart />
            <CommitTimeChart />
          </div>

          <div className="mt-6">
            <ActivityRingChart />
          </div>

          <div className="mt-6">
            <CodingActivityInsightsCard />
          </div>

          <div className="mt-6">
            <PRReviewTrendChart />
          </div>

          <div
            id="issues"
            className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            <div className="lg:col-span-2">
              <IssueMetrics />
            </div>
            <CIAnalytics />
          </div>

          {/* Row 3b: Discussion activity */}
          <div className="mt-6">
            <DiscussionsWidget />
          </div>
          <div className="mt-6">
            <PinnedRepos />
          </div>

          <div className="mt-6">
            <InactiveRepositoriesCard />
          </div>
          <div
            id="top-repos"
            className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            <TopRepos />
            <LanguageBreakdown />
            <GoalTracker />
          </div>
          <div id="recent-activity" className="mt-6">
            <RecentActivity />
          </div>
        </div>
      </div>
    </div>
  );
}
