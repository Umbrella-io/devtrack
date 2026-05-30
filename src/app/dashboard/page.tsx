import ContributionGraph from "@/components/ContributionGraph";
import PRMetrics from "@/components/PRMetrics";
import GoalTracker from "@/components/GoalTracker";
import DashboardHeader from "@/components/DashboardHeader";
import StreakTracker from "@/components/StreakTracker";
import TopRepos from "@/components/TopRepos";
import LanguageBreakdown from "@/components/LanguageBreakdown";
import StreakAtRiskBanner from "@/components/StreakAtRiskBanner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
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
        {/* Live region: announces dynamic alerts to screen readers */}
        <div
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
          id="live-announcer"
        />

        <ErrorBoundary section="Streak Alert">
          <StreakAtRiskBanner />
        </ErrorBoundary>

        {/* Row 1: Contribution graph + Streak */}
        <section
          aria-label="Activity overview"
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
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
        <section
          aria-label="Repositories, languages, and goals"
          className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
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
      </main>
    </div>
  );
}