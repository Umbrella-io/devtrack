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

const RepoContributionDistribution = dynamic(
  () => import("@/components/RepoContributionDistribution"),
  {
    ssr: false,
    loading: () => <SkeletonCard />,
  },
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
      <div className="min-h-screen bg-[var(--background)] px-4 py-8 text-[var(--foreground)] transition-colors sm:px-6 lg:px-8 max-w-[1600px] mx-auto">
        <DashboardHeader />

        {/* Quick actions */}
        <div className="mt-8 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Left side actions */}
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <Link
              href="/wrapped"
              className="inline-flex w-full sm:w-auto justify-center items-center gap-2 rounded-xl border border-[var(--accent)] bg-[var(--accent)]/10 px-5 py-2.5 text-sm font-semibold text-[var(--accent)] shadow-sm shadow-[var(--accent)]/20 transition-all hover:bg-[var(--accent)]/20 hover:scale-[1.02]"
            >
              Year in Code
            </Link>
            <Link
              href="/dashboard/settings"
              className="inline-flex w-full sm:w-auto justify-center items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium transition-all hover:bg-white/10 hover:scale-[1.02]"
            >
              Settings
            </Link>
          </div>
          {/* Right side exports */}
          <div className="w-full sm:w-auto">
            <ExportButton />
          </div>
        </div>

        <div className="space-y-4">
          <StreakAtRiskBanner />
        </div>

        {/* Hero Section */}
        <section className="mt-8">
          <TodayFocusHero userName={session.user?.name ?? null} />
        </section>

        {/* 1. OVERVIEW SECTION */}
        <section className="mt-14 space-y-6">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <div className="h-8 w-1.5 rounded-full bg-[var(--accent)] shadow-[0_0_15px_var(--accent)]"></div>
            <h2 className="text-2xl font-bold tracking-tight">Overview</h2>
          </div>
          <div className="grid grid-cols-1 gap-6 w-full">
            <WeeklySummaryCard />
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 w-full">
            <div className="flex flex-col gap-6 w-full overflow-hidden">
              <PersonalRecords />
            </div>
            <div className="flex flex-col gap-6 w-full h-full">
              <AIMentorWidget />
            </div>
          </div>
        </section>

        {/* 2. ACTIVITY & CODING TIME */}
        <section id="streaks" className="mt-14 space-y-6 scroll-mt-28">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <div className="h-8 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
            <h2 className="text-2xl font-bold tracking-tight">Activity & Coding</h2>
          </div>
          
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 w-full">
            <div className="xl:col-span-2 flex flex-col gap-6 w-full overflow-hidden">
              <div className="w-full overflow-x-auto pb-2">
                <ContributionGraph />
              </div>
              <div className="w-full overflow-x-auto pb-2">
                <ContributionHeatmap />
              </div>
              <LazyWidget fallback={<SkeletonCard />}>
                <RepoContributionDistribution />
              </LazyWidget>
              <LazyWidget fallback={<SkeletonCard />}>
                <ActivityRingChart />
              </LazyWidget>
              <LazyWidget fallback={<SkeletonCard />}>
                <CodingActivityInsightsCard />
              </LazyWidget>
            </div>
            <div className="flex flex-col gap-6 w-full overflow-hidden">
              <StreakTracker />
              <LocalCodingTime />
              <CodingTimeWidget />
              <LazyWidget fallback={<SkeletonCard />}>
                <CommitTimeChart />
              </LazyWidget>
            </div>
          </div>
        </section>

        {/* 3. ANALYTICS & REPOSITORIES */}
        <section id="pull-requests" className="mt-14 space-y-6 scroll-mt-28">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <div className="h-8 w-1.5 rounded-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
            <h2 className="text-2xl font-bold tracking-tight">Analytics & Repositories</h2>
          </div>

          {/* Repo Analytics Explorer spans full width */}
          <div className="w-full overflow-hidden">
            <LazyWidget fallback={<SkeletonCard />}>
              <RepoAnalyticsExplorer />
            </LazyWidget>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
            <div className="flex flex-col gap-6 w-full overflow-hidden">
              <PRMetrics />
              <LazyWidget fallback={<SkeletonCard />}>
                <PRBreakdownChart />
              </LazyWidget>
              <LazyWidget fallback={<SkeletonCard />}>
                <PRReviewTrendChart />
              </LazyWidget>
              <LazyWidget fallback={<SkeletonCard />}>
                <DiscussionsWidget />
              </LazyWidget>
            </div>
            <div className="flex flex-col gap-6 w-full overflow-hidden">
              <CommunityMetrics />
              <LazyWidget fallback={<SkeletonCard />}>
                <PinnedReposWidget />
              </LazyWidget>
              <LazyWidget fallback={<SkeletonCard />}>
                <TopRepos />
              </LazyWidget>
              <LazyWidget fallback={<SkeletonCard />}>
                <InactiveRepositoriesCard />
              </LazyWidget>
            </div>
          </div>
        </section>

        {/* 4. GOALS & INSIGHTS */}
        <section id="goals" className="mt-14 space-y-6 scroll-mt-28 mb-12">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <div className="h-8 w-1.5 rounded-full bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]"></div>
            <h2 className="text-2xl font-bold tracking-tight">Goals & Insights</h2>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 w-full">
            <div className="xl:col-span-2 flex flex-col gap-6 w-full overflow-hidden">
              <LazyWidget fallback={<SkeletonCard />}>
                <IssueMetrics />
              </LazyWidget>
              <GoalTracker />
              <LazyWidget fallback={<SkeletonCard />}>
                <RecentActivity />
              </LazyWidget>
            </div>
            <div className="flex flex-col gap-6 w-full overflow-hidden">
              <LazyWidget fallback={<SkeletonCard />}>
                <CIAnalytics />
              </LazyWidget>
              <LazyWidget fallback={<SkeletonCard />}>
                <LanguageBreakdown />
              </LazyWidget>
              <LazyWidget fallback={<SkeletonCard />}>
                <FriendComparison />
              </LazyWidget>
            </div>
          </div>
        </section>
      </div>
    </DashboardSSEProvider>
  );
}
