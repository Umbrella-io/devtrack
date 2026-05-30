import ContributionGraph from "@/components/ContributionGraph";
import PRMetrics from "@/components/PRMetrics";
import GoalTracker from "@/components/GoalTracker";
import DashboardHeader from "@/components/DashboardHeader";
import StreakTracker from "@/components/StreakTracker";
import TopRepos from "@/components/TopRepos";
import LanguageBreakdown from "@/components/LanguageBreakdown";
import StreakAtRiskBanner from "@/components/StreakAtRiskBanner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import WeeklySummaryCard from "@/components/WeeklySummaryCard";
import { AIMentorWidget } from "@/components/AIMentorWidget";
import ExportButton from "@/components/ExportButton";
import Link from "next/link";
import PersonalRecords from "@/components/PersonalRecords";
import RepoAnalyticsExplorer from "@/components/repo-analytics/RepoAnalyticsExplorer";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-[var(--background)] p-4 md:p-8 text-[var(--foreground)] transition-colors">
      <ErrorBoundary section="Dashboard Header">
        <DashboardHeader />
      </ErrorBoundary>

      <main id="main-content" aria-label="Developer dashboard">
        <div aria-live="polite" aria-atomic="true" className="sr-only" id="live-announcer" />

        <ErrorBoundary section="Streak Alert">
          <StreakAtRiskBanner />
        </ErrorBoundary>

        {/* Quick actions */}
        <div className="mt-4 flex flex-wrap items-center gap-2 sm:gap-3">
          <Link
            href="/wrapped"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-2 text-sm font-semibold text-[var(--accent)] transition-opacity hover:opacity-90"
          >
            ✨ Year in Code
          </Link>
          <Link
            href="/dashboard/settings"
            className="secondary-button inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium"
          >
            Settings
          </Link>
          <div className="sm:ml-auto">
            <ExportButton />
          </div>
        </div>

        {/* Weekly summary */}
        <div className="mt-6">
          <ErrorBoundary section="Weekly Summary">
            <WeeklySummaryCard />
          </ErrorBoundary>
        </div>

        {/* Personal records + AI mentor */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ErrorBoundary section="Personal Records">
            <PersonalRecords />
          </ErrorBoundary>
          <ErrorBoundary section="AI Mentor">
            <AIMentorWidget />
          </ErrorBoundary>
        </div>

        {/* Row 1: Contribution graph + Streak */}
        <section aria-label="Activity overview" className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ErrorBoundary section="Contribution Graph">
              <ContributionGraph />
            </ErrorBoundary>
          </div>
          <div className="flex flex-col gap-6">
            <ErrorBoundary section="Streak Tracker">
              <StreakTracker />
            </ErrorBoundary>
          </div>
        </section>

        {/* Row 2: PR metrics */}
        <section aria-label="Pull request analytics" className="mt-6">
          <ErrorBoundary section="PR Metrics">
            <PRMetrics />
          </ErrorBoundary>
        </section>

        {/* Row 3: Top repos + Language breakdown + Goal tracker */}
        <section aria-label="Repositories, languages, and goals" className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ErrorBoundary section="Top Repos">
            <TopRepos />
          </ErrorBoundary>
          <ErrorBoundary section="Language Breakdown">
            <LanguageBreakdown />
          </ErrorBoundary>
          <ErrorBoundary section="Goal Tracker">
            <GoalTracker />
          </ErrorBoundary>
        </section>

        {/* Repo Analytics */}
        <div className="mt-6">
          <ErrorBoundary section="Repo Analytics">
            <RepoAnalyticsExplorer />
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}