import TodayFocusHero from "@/components/TodayFocusHero";
import DashboardHeader from "@/components/DashboardHeader";
import ExportButton from "@/components/ExportButton";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import DashboardSSEProvider from "@/components/DashboardSSEProvider";
import StreakAtRiskBanner from "@/components/StreakAtRiskBanner";
import ThrottleBanner from "@/components/ThrottleBanner";
import CustomizableDashboard from "@/components/dashboard/CustomizableDashboard";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/");

  return (
    <DashboardSSEProvider>
      {/* Responsive outer container: tighter padding on mobile, wider on desktop */}
      <div className="min-h-screen bg-[var(--background)] px-3 py-5 text-[var(--foreground)] transition-colors sm:px-6 sm:py-8 lg:px-8 max-w-[1600px] mx-auto">
        <DashboardHeader />

        {/* Quick actions — stack on mobile, row on sm+ */}
        <div className="mt-6 mb-6 sm:mt-8 sm:mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Quick actions */}
        <div className="mt-8 mb-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Left side actions */}
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
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

          <div className="w-full sm:w-auto">
            <ExportButton />
          </div>
        </div>

        <div className="space-y-4 mb-8">
          <ThrottleBanner />
          <StreakAtRiskBanner />
        </div>

        {/* Hero Section */}
        <section className="mt-6 sm:mt-8">
          <TodayFocusHero userName={session.user?.name ?? null} />
        </section>

        {/* Section heading helper — smaller on mobile */}
        {/* 1. OVERVIEW SECTION */}
        <section className="mt-10 sm:mt-14 space-y-6">
          <div className="flex items-center gap-3 border-b border-white/10 pb-3 sm:pb-4">
            <div className="h-7 w-1.5 sm:h-8 rounded-full bg-[var(--accent)] shadow-[0_0_15px_var(--accent)]"></div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Overview</h2>
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
        <section id="streaks" className="mt-10 sm:mt-14 space-y-6 scroll-mt-20 sm:scroll-mt-28">
          <div className="flex items-center gap-3 border-b border-white/10 pb-3 sm:pb-4">
            <div className="h-7 w-1.5 sm:h-8 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Activity & Coding</h2>
          </div>

          {/* On mobile: single column stack; xl: 3-col grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 w-full">
            <div className="xl:col-span-2 flex flex-col gap-6 w-full overflow-hidden">
              {/* Horizontally scrollable charts on small screens */}
              <div className="w-full overflow-x-auto pb-2 -mx-3 px-3 sm:mx-0 sm:px-0">
                <ContributionGraph />
              </div>
              <div className="w-full overflow-x-auto pb-2 -mx-3 px-3 sm:mx-0 sm:px-0">
                <ContributionHeatmap />
        <section className="mt-8">
          <TodayFocusHero userName={session.user?.name ?? null} />
        </section>

        <section className="mt-14">
          <div className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-gradient-to-r from-violet-950/20 via-indigo-950/10 to-transparent p-6 shadow-lg flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold text-violet-400 tracking-wider px-2 py-0.5 rounded bg-violet-500/10 border border-violet-500/20">
                  New Feature
                </span>
                <span className="text-xs text-[var(--muted-foreground)]">
                  AI Resume Generator
                </span>
              </div>

        {/* 3. ANALYTICS & REPOSITORIES */}
        <section id="pull-requests" className="mt-10 sm:mt-14 space-y-6 scroll-mt-20 sm:scroll-mt-28">
          <div className="flex items-center gap-3 border-b border-white/10 pb-3 sm:pb-4">
            <div className="h-7 w-1.5 sm:h-8 rounded-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Analytics & Repositories</h2>
          </div>

          {/* Repo Analytics Explorer — full width, scrollable on mobile */}
          <div className="w-full overflow-x-auto overflow-y-hidden -mx-3 px-3 sm:mx-0 sm:px-0 sm:overflow-x-hidden">
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
              <h3 className="text-lg font-bold text-[var(--foreground)]">
                Generate an ATS-Friendly CV Backed by Your Real Code
              </h3>

              <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                Analyze your GitHub contributions, merged PRs, and lines of code
                changed to automatically generate professional bullet points for
                your target roles.
              </p>
            </div>

        {/* 4. GOALS & INSIGHTS */}
        <section id="goals" className="mt-10 sm:mt-14 space-y-6 scroll-mt-20 sm:scroll-mt-28 mb-12">
          <div className="flex items-center gap-3 border-b border-white/10 pb-3 sm:pb-4">
            <div className="h-7 w-1.5 sm:h-8 rounded-full bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]"></div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Goals & Insights</h2>
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
            <Link
              href="/dashboard/career-intelligence"
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-500/20 hover:scale-[1.03] transition-all whitespace-nowrap"
            >
              Build Resume
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <CustomizableDashboard />
      </div>
    </DashboardSSEProvider>
  );
}