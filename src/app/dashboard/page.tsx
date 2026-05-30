import ContributionGraph from "@/components/ContributionGraph";
import PRMetrics from "@/components/PRMetrics";
import GoalTracker from "@/components/GoalTracker";
import DashboardHeader from "@/components/DashboardHeader";
import StreakTracker from "@/components/StreakTracker";
import TopRepos from "@/components/TopRepos";
import LanguageBreakdown from "@/components/LanguageBreakdown";
import StreakAtRiskBanner from "@/components/StreakAtRiskBanner";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/");
  }

  return (
    <div
      className="min-h-screen bg-[var(--background)] p-4 md:p-8 text-[var(--foreground)] transition-colors"
    >
      <DashboardHeader />

      <main id="main-content" aria-label="Developer dashboard">
        {/* Live region: announces dynamic alerts to screen readers */}
        <div aria-live="polite" aria-atomic="true" className="sr-only" id="live-announcer" />

        <StreakAtRiskBanner />

        {/* Row 1: Contribution graph + Streak */}
        <section aria-label="Activity overview" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ContributionGraph />
          </div>
          <div className="flex flex-col gap-6">
            <StreakTracker />
          </div>
        </section>

        {/* Row 2: PR metrics */}
        <section aria-label="Pull request analytics" className="mt-6">
          <PRMetrics />
        </section>

        {/* Row 3: Top repos + Language breakdown + Goal tracker */}
        <section aria-label="Repositories, languages, and goals" className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <TopRepos />
          <LanguageBreakdown />
          <GoalTracker />
        </section>
      </main>
    </div>
  );
}