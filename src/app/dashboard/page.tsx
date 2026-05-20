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
import PRReviewTrendChart from "@/components/PRReviewTrendChart";
import CIAnalytics from "@/components/CIAnalytics";
import IssueMetrics from "@/components/IssueMetrics";
import StreakAtRiskBanner from "@/components/StreakAtRiskBanner";
import FriendComparison from "@/components/FriendComparison";
import WeeklySummaryCard from "@/components/WeeklySummaryCard";
import ExportButton from "@/components/ExportButton";
import Link from "next/link";
import RepoAnalyticsExplorer from "@/components/repo-analytics/RepoAnalyticsExplorer";
import PersonalRecords from "@/components/PersonalRecords";
import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const allowPlaywrightBypass =
    process.env.PLAYWRIGHT_AUTH_BYPASS === "1" &&
    cookies().get("playwright-dashboard-auth")?.value === "1";
  const session = allowPlaywrightBypass
    ? null
    : await getServerSession(authOptions);

  if (!session && !allowPlaywrightBypass) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-[var(--background)] p-4 md:p-8 text-[var(--foreground)] transition-colors">
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

      <WeeklySummaryCard />

    <div className="mb-6">
      <PersonalRecords />
    </div>

    {/* Row 1: Contribution graph + Streak + Friend Comparison */}
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

      {/* LEFT SIDE */}
      <div className="flex flex-col gap-6 lg:col-span-2">
        <ContributionGraph />

        <div className="mt-6">
          <ContributionHeatmap />
        </div>

        {/* Repo Explorer BELOW commit activity */}
        <RepoAnalyticsExplorer />
      </div>

      {/* RIGHT SIDE */}
      <div className="flex flex-col gap-6">
        <StreakTracker />
        <FriendComparison />
      </div>

<<<<<<< HEAD
    </div>

    <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
      <PRMetrics />
      <PRBreakdownChart />
      <CommitTimeChart />
    </div>
=======
      <div className="mt-6">
        <PRReviewTrendChart />
      </div>
>>>>>>> 371c5fe6e801f173110dd13f906d7fefc65ea584

      {/* Row 3: Issue metrics + CI analytics */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <IssueMetrics />
        </div>
        <CIAnalytics />
      </div>

    <div className="mt-6">
      <PinnedRepos />
    </div>

    <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
      <TopRepos />
      <LanguageBreakdown />
      <GoalTracker />
    </div>

  </div>
  )
}
