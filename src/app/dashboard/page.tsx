import ContributionGraph from "@/components/ContributionGraph";
import PRMetrics from "@/components/PRMetrics";
import GoalTracker from "@/components/GoalTracker";
import DashboardHeader from "@/components/DashboardHeader";
import StreakTracker from "@/components/StreakTracker";
import TopRepos from "@/components/TopRepos";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/");
  }

  return (
  <div className="min-h-screen bg-slate-900 p-4 md:p-8">
      <DashboardHeader />

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

      {/* Row 3: Top repos + Goal tracker */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopRepos />
        <GoalTracker />
      </div>
    </div>
  );
}
