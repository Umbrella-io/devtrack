import ContributionGraph from "@/components/ContributionGraph";
import PRMetrics from "@/components/PRMetrics";
import GoalTracker from "@/components/GoalTracker";
import DashboardHeader from "@/components/DashboardHeader";
import StreakTracker from "@/components/StreakTracker";
import TopRepos from "@/components/TopRepos";
import LanguageBreakdown from "@/components/LanguageBreakdown";
import IssueMetrics from "@/components/IssueMetrics";
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
    <div className="min-h-screen bg-[var(--background)] p-4 md:p-8 text-[var(--foreground)] transition-colors">
      <DashboardHeader />

      <StreakAtRiskBanner />

      {/* Row 1: Contribution graph + Streak + Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ContributionGraph />
        </div>

        <div className="flex flex-col gap-6">
          <StreakTracker />
        </div>
      </div>

      {/* Row 2: PR metrics */}
      <div className="mt-6">
        <PRMetrics />
      </div>

      {/* Row 3: Issue metrics */}
      <div className="mt-6">
        <IssueMetrics />
      </div>

      {/* Row 4: Top repos + Language breakdown + Goal tracker */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TopRepos />
        <LanguageBreakdown />
        <GoalTracker />
      </div>
    </div>
  );
}