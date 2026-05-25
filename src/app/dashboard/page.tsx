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
import DashboardQuickSearch from "@/components/DashboardQuickSearch";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/");
  // If the JWT callback detected that the GitHub token has been revoked,
  // redirect to the landing page so the user must re-authenticate.
  if (session.error === "TokenRevoked") redirect("/");

  return (
    <div className="min-h-screen bg-[var(--background)] p-4 md:p-8 text-[var(--foreground)] transition-colors">
      <DashboardHeader />
      <DashboardQuickSearch>
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <Link
            href="/dashboard/settings"
            className="inline-flex min-w-[140px] items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--control)] px-4 py-2 text-sm text-[var(--foreground)] transition-opacity hover:opacity-90"
          >
            Settings
          </Link>
          <ExportButton />
        </div>

        <div data-dashboard-search-item data-dashboard-search-text="streak">
          <StreakAtRiskBanner />
        </div>

        <div className="mb-6" data-dashboard-search-item data-dashboard-search-text="weekly summary commits goals pull requests repositories languages">
          <WeeklySummaryCard />
        </div>

        <div className="mb-6" data-dashboard-search-item data-dashboard-search-text="ai mentor">
          <AIMentorWidget />
        </div>

        <div className="mb-6" data-dashboard-search-item data-dashboard-search-text="personal records commits pull requests">
          <PersonalRecords />
        </div>

        {/* Row 1: Contribution graph + Streak + Local Coding Time */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6" data-dashboard-search-group>
            <div data-dashboard-search-item data-dashboard-search-text="commits contribution graph">
              <ContributionGraph />
            </div>
            <div data-dashboard-search-item data-dashboard-search-text="commits contribution heatmap">
              <ContributionHeatmap />
            </div>
            <div data-dashboard-search-item data-dashboard-search-text="commits friend comparison">
              <FriendComparison />
            </div>
          </div>

          <div className="space-y-6" data-dashboard-search-group>
            <div data-dashboard-search-item data-dashboard-search-text="streak commits">
              <StreakTracker />
            </div>
            <div data-dashboard-search-item data-dashboard-search-text="coding time local coding time">
              <LocalCodingTime />
            </div>
          </div>
        </div>

        {/* Row 2: PR metrics, community metrics, PR breakdown & Time Chart */}
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          <div data-dashboard-search-item data-dashboard-search-text="pull requests pr metrics">
            <PRMetrics />
          </div>
          <div data-dashboard-search-item data-dashboard-search-text="pull requests community metrics">
            <CommunityMetrics />
          </div>
          <div data-dashboard-search-item data-dashboard-search-text="pull requests breakdown">
            <PRBreakdownChart />
          </div>
          <div data-dashboard-search-item data-dashboard-search-text="commits commit time">
            <CommitTimeChart />
          </div>
        </div>

        {/* Row 2b: Activity Ring Chart */}
        <div className="mt-6" data-dashboard-search-item data-dashboard-search-text="commits activity ring">
          <ActivityRingChart />
        </div>

        <div className="mt-6" data-dashboard-search-item data-dashboard-search-text="coding activity commits">
          <CodingActivityInsightsCard />
        </div>

        <div className="mt-6" data-dashboard-search-item data-dashboard-search-text="pull requests review trend">
          <PRReviewTrendChart />
        </div>

        {/* Row 3: Issue metrics + CI analytics */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2" data-dashboard-search-item data-dashboard-search-group data-dashboard-search-text="issues issue metrics">
            <IssueMetrics />
          </div>
          <div data-dashboard-search-item data-dashboard-search-text="ci analytics">
            <CIAnalytics />
          </div>
        </div>

        {/* Row 3b: Discussion activity */}
        <div className="mt-6" data-dashboard-search-item data-dashboard-search-text="discussions">
          <DiscussionsWidget />
        </div>

        {/* Row 4: Pinned repositories */}
        <div className="mt-6" data-dashboard-search-item data-dashboard-search-text="repository names pinned repositories">
          <PinnedRepos />
        </div>

        {/* Row 5: Inactive repository reminder */}
        <div className="mt-6" data-dashboard-search-item data-dashboard-search-text="inactive repositories repository names">
          <InactiveRepositoriesCard />
        </div>

        {/* Row 6: Top repos + Language breakdown + Goal tracker */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div data-dashboard-search-item data-dashboard-search-text="repositories commits repo names top repositories">
            <TopRepos />
          </div>
          <div data-dashboard-search-item data-dashboard-search-text="language names languages">
            <LanguageBreakdown />
          </div>
          <div data-dashboard-search-item data-dashboard-search-text="goals goal labels commits prs hours">
            <GoalTracker />
          </div>
        </div>

        {/* Row 7: Recent GitHub activity */}
        <div className="mt-6" data-dashboard-search-item data-dashboard-search-text="recent activity commits pull requests">
          <RecentActivity />
        </div>
      </DashboardQuickSearch>
    </div>
  );
}
