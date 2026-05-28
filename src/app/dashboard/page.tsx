import LazyWidget from "@/components/LazyWidget";
import DiscussionsWidget from "@/components/DiscussionsWidget";
import CommunityMetrics from "@/components/CommunityMetrics";
import GoalTracker from "@/components/GoalTracker";
import DashboardHeader from "@/components/DashboardHeader";
import StreakTracker from "@/components/StreakTracker";
import TopRepos from "@/components/TopRepos";
import PinnedRepos from "@/components/PinnedRepos";
import PinnedReposWidget from "@/components/PinnedReposWidget";
import InactiveRepositoriesCard from "@/components/InactiveRepositoriesCard";
import LanguageBreakdown from "@/components/LanguageBreakdown";
import CIAnalytics from "@/components/CIAnalytics";
import IssueMetrics from "@/components/IssueMetrics";
import StreakAtRiskBanner from "@/components/StreakAtRiskBanner";
import RepoAnalyticsExplorer from "@/components/repo-analytics/RepoAnalyticsExplorer";
import dynamic from "next/dynamic";
import WeeklySummaryCard from "@/components/WeeklySummaryCard";
import { AIMentorWidget } from "@/components/AIMentorWidget";
import ExportButton from "@/components/ExportButton";
import Link from "next/link";
import PersonalRecords from "@/components/PersonalRecords";
import LocalCodingTime from "@/components/LocalCodingTime";
import CodingTimeWidget from "@/components/CodingTimeWidget";
import RecentActivity from "@/components/RecentActivity";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import DashboardSSEProvider from "@/components/DashboardSSEProvider";

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

const FriendComparison = dynamic(
  () => import("@/components/FriendComparison"),
  { ssr: false, loading: () => <SkeletonCard /> }
);

const ActivityRingChart = dynamic(
  () => import("@/components/ActivityRingChart"),
  { ssr: false, loading: () => <SkeletonCard /> }
);

const ContributionGraph = dynamic(
  () => import("@/components/ContributionGraph"),
  { ssr: false, loading: () => <ContributionGraphSkeleton /> }
);

const ContributionHeatmap = dynamic(
  () => import("@/components/ContributionHeatmap"),
  { ssr: false, loading: () => <SkeletonCard /> }
);

const PRMetrics = dynamic(() => import("@/components/PRMetrics"), {
  ssr: false,
  loading: () => <PRMetricsSkeleton />,
});

const PRBreakdownChart = dynamic(
  () => import("@/components/PRBreakdownChart"),
  { ssr: false, loading: () => <SkeletonCard /> }
);

const CommitTimeChart = dynamic(() => import("@/components/CommitTimeChart"), {
  ssr: false,
  loading: () => <SkeletonCard />,
});

const PRReviewTrendChart = dynamic(
  () => import("@/components/PRReviewTrendChart"),
  { ssr: false, loading: () => <SkeletonCard /> }
);

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/");

  return (
    <DashboardSSEProvider>
      <div className="min-h-screen overflow-x-hidden bg-[var(--background)] p-4 text-[var(--foreground)] transition-colors md:p-8">
        <DashboardHeader />
        
        {/* Navigation Buttons Row */}
        <div className="mb-6 flex flex-wrap items-stretch justify-center gap-2 sm:justify-end">
          <Link
            href="/wrapped"
            className="flex min-w-0 flex-1 items-center justify-center rounded-lg border border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-2 text-center text-sm font-semibold text-[var(--accent)] transition-opacity hover:opacity-90 sm:min-w-[140px] sm:flex-none"
          >
            Year in Code
          </Link>
          <Link
            href="/dashboard/settings"
            className="secondary-button flex min-w-0 flex-1 items-center justify-center rounded-xl px-4 py-2 text-center text-sm font-medium sm:min-w-[140px] sm:flex-none"
          >
            Settings
          </Link>
          <div className="w-full sm:w-auto">
            <ExportButton />
          </div>
        </div>

        <StreakAtRiskBanner />

        {/* Wrapped Promo Banner */}
        <div className="mb-6 mt-6">
          <Link href="/wrapped">
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-fuchsia-600 p-6 shadow-lg transition-transform hover:scale-[1.01]">
              <div className="relative z-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    Your Year in Code is here! ✨
                  </h2>
                  <p className="mt-1 text-white/90">
                    Discover your top languages, longest streaks, and coding habits of the year.
                  </p>
                </div>
                <div className="inline-block self-start rounded-full bg-white px-6 py-2 font-bold text-purple-600 sm:self-auto">
                  View Wrapped
                </div>
              </div>
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/20 blur-3xl"></div>
              <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-black/20 blur-3xl"></div>
            </div>
          </Link>
        </div>

        {/* Top Metric Cards */}
        <div className="mb-6 space-y-6">
          <WeeklySummaryCard />
          <AIMentorWidget />
          <PersonalRecords />
        </div>

        {/* Main Workspace Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-w-0">
          {/* Main Analytics Columns (2/3 width on desktop) */}
          <div className="lg:col-span-2 space-y-6">
            <ContributionGraph />
            
            <LazyWidget fallback={<SkeletonCard />}>
              <ContributionHeatmap />
            </LazyWidget>

            <LazyWidget fallback={<SkeletonCard />}>
              <FriendComparison />
            </LazyWidget>

            <div className="w-full min-w-0 overflow-hidden">
              <RepoAnalyticsExplorer />
            </div>

            {/* Supplementary Code Performance Visualizations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <CodingActivityInsightsCard />
              <ActivityRingChart />
              <PRMetrics />
              <PRBreakdownChart />
              <CommitTimeChart />
              <PRReviewTrendChart />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <LanguageBreakdown />
              <CIAnalytics />
              <IssueMetrics />
              <InactiveRepositoriesCard />
            </div>
          </div>

          {/* Sidebar Tracking Panel (1/3 width on desktop) */}
          <div className="space-y-6">
            <StreakTracker />
            <LocalCodingTime />
            <CodingTimeWidget />
            <GoalTracker />
            <RecentActivity />
            <DiscussionsWidget />
            <CommunityMetrics />
            <PinnedReposWidget />
            <TopRepos />
            <PinnedRepos />
          </div>
        </div>

      </div>
    </DashboardSSEProvider>
  );
}
