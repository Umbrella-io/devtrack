import LazyWidget from "@/components/LazyWidget";
import DiscussionsWidget from "@/components/DiscussionsWidget";
import CommunityMetrics from "@/components/CommunityMetrics";
import GoalTracker from "@/components/GoalTracker";
import TodayFocusHero from "@/components/TodayFocusHero";
import DashboardHeader from "@/components/DashboardHeader";
import StreakTracker from "@/components/StreakTracker";
import TopRepos from "@/components/TopRepos";
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
    <h2 className="text-lg font-semibold text-[var(--foreground)]">Your Commits</h2>
    <div className="mt-3 h-40 rounded bg-[var(--card-muted)] animate-pulse" />
  </div>
);

const PRMetricsSkeleton = () => (
  <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
    <h2 className="text-lg font-semibold text-[var(--card-foreground)]">PR Analytics</h2>
    <div className="mt-3 h-40 rounded bg-[var(--card-muted)] animate-pulse" />
  </div>
);

const CodingActivityInsightsCard = dynamic(
  () => import("@/components/CodingActivityInsightsCard"),
  { ssr: false, loading: () => <SkeletonCard /> },
);

const FriendComparison = dynamic(
  () => import("@/components/FriendComparison"),
  { ssr: false, loading: () => <SkeletonCard /> },
);

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

const PRMetrics = dynamic(() => import("@/components/PRMetrics"), {
  ssr: false,
  loading: () => <PRMetricsSkeleton />,
});

const PRBreakdownChart = dynamic(
  () => import("@/components/PRBreakdownChart"),
  { ssr: false, loading: () => <SkeletonCard /> },
);

const CommitTimeChart = dynamic(
  () => import("@/components/CommitTimeChart"),
  { ssr: false, loading: () => <SkeletonCard /> },
);

const PRReviewTrendChart = dynamic(
  () => import("@/components/PRReviewTrendChart"),
  { ssr: false, loading: () => <SkeletonCard /> },
);

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/");

  return (
    <DashboardSSEProvider>
      <div className="min-h-screen bg-[var(--background)] p-4 text-[var(--foreground)] transition-colors md:p-8">
        <DashboardHeader />

        <div className="mt-6 mb-6">
          <TodayFocusHero userName={session.user?.name ?? null} />
        </div>

        {/* Action bar */}
        <div
          id="overview"
          className="mb-6 flex flex-wrap items-stretch justify-center gap-2 scroll-mt-24 sm:justify-end"
        >
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

        {/* Weekly summary — full width */}
        <div className="mt-6">
          <WeeklySummaryCard />
        </div>

        {/* Personal records + AI mentor side by side */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PersonalRecords />
          <AIMentorWidget />
        </div>

        {/* -- Row 1: Contribution graph (2/3) + Streak sidebar (1/3) -- */}
        <div id="streaks" className="mt-6 grid grid-cols-1 gap-6 scroll-mt-24 lg:grid-cols-3">
          {/* Left: contribution graph + heatmap */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <ContributionGraph />
            <LazyWidget fallback={<SkeletonCard />}>
              <ContributionHeatmap />
            </LazyWidget>
          </div>

          {/* Right: streak + coding time */}
          <div className="flex flex-col gap-6">
            <StreakTracker />
            <LocalCodingTime />
            <CodingTimeWidget />
          </div>
        </div>

        {/* Friend comparison — full width, below the fold */}
        <div className="mt-6">
          <LazyWidget fallback={<SkeletonCard />}>
            <FriendComparison />
          </LazyWidget>
        </div>

        {/* Repo analytics explorer — full width */}
        <div className="mt-6">
          <LazyWidget fallback={<SkeletonCard />}>
            <RepoAnalyticsExplorer />
          </LazyWidget>
        </div>

        {/* -- Row 2: PR metrics + Community metrics -- */}
        <div id="pull-requests" className="mt-6 grid grid-cols-1 gap-6 scroll-mt-24 md:grid-cols-2">
          <PRMetrics />
          <CommunityMetrics />
        </div>

        {/* PR breakdown + commit time — 2-col so charts have room */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <LazyWidget fallback={<SkeletonCard />}>
            <PRBreakdownChart />
          </LazyWidget>
          <LazyWidget fallback={<SkeletonCard />}>
            <CommitTimeChart />
          </LazyWidget>
        </div>

        {/* Activity ring — full width */}
        <div className="mt-6">
          <LazyWidget fallback={<SkeletonCard />}>
            <ActivityRingChart />
          </LazyWidget>
        </div>

        {/* Coding activity insights — full width */}
        <div className="mt-6">
          <LazyWidget fallback={<SkeletonCard />}>
            <CodingActivityInsightsCard />
          </LazyWidget>
        </div>

        {/* PR review trend — full width */}
        <div className="mt-6">
          <LazyWidget fallback={<SkeletonCard />}>
            <PRReviewTrendChart />
          </LazyWidget>
        </div>

        {/* -- Row 3: Issues (2/3) + CI analytics (1/3) -- */}
        <div id="goals" className="mt-6 grid grid-cols-1 gap-6 scroll-mt-24 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <LazyWidget fallback={<SkeletonCard />}>
              <IssueMetrics />
            </LazyWidget>
          </div>
          <LazyWidget fallback={<SkeletonCard />}>
            <CIAnalytics />
          </LazyWidget>
        </div>

        {/* Discussions — full width */}
        <div className="mt-6">
          <LazyWidget fallback={<SkeletonCard />}>
            <DiscussionsWidget />
          </LazyWidget>
        </div>

        {/* Pinned spotlight repos — full width */}
        <div className="mt-6">
          <LazyWidget fallback={<SkeletonCard />}>
            <PinnedReposWidget />
          </LazyWidget>
        </div>

        {/* Inactive repo reminder — full width */}
        <div className="mt-6">
          <LazyWidget fallback={<SkeletonCard />}>
            <InactiveRepositoriesCard />
          </LazyWidget>
        </div>

        {/* -- Row 4: Top repos + Language breakdown + Goal tracker -- */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <LazyWidget fallback={<SkeletonCard />}>
            <TopRepos />
          </LazyWidget>
          <LazyWidget fallback={<SkeletonCard />}>
            <LanguageBreakdown />
          </LazyWidget>
          <GoalTracker />
        </div>

        {/* Recent activity — full width */}
        <div className="mt-6">
          <LazyWidget fallback={<SkeletonCard />}>
            <RecentActivity />
          </LazyWidget>
        </div>
      </div>
    </DashboardSSEProvider>
  );
}
