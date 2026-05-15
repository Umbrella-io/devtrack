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

import ExportButton from "@/components/ExportButton";
import { headers } from "next/headers";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/");
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";

  const fetchOptions = {
    headers: headers(),
    cache: "no-store" as RequestCache,
  };

  const [prRes, goalsRes, contribRes] = await Promise.all([
    fetch(`${baseUrl}/api/metrics/prs`, fetchOptions),
    fetch(`${baseUrl}/api/goals`, fetchOptions),
    fetch(`${baseUrl}/api/metrics/contributions?days=365`, fetchOptions),
  ])

  const prData = prRes.ok ? await prRes.json() : null;
  const goalsData = goalsRes.ok ? await goalsRes.json() : { goals: [] };
  const contribDataRaw = contribRes.ok ? await contribRes.json() : { data: {} };

  const contribData = Object.entries(contribDataRaw.data ?? {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, commits]) => ({ day, commits: commits as number }));
  

 return (
      <div className="min-h-screen bg-[var(--background)] p-4 md:p-8 text-[var(--foreground)] transition-colors">
        <DashboardHeader />
        <StreakAtRiskBanner />
        <div className="mb-5">
        <ExportButton 
          prData={prData} 
          contribData={contribData} 
          goalsData={goalsData.goals} 
        />
      </div>

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
        <PRMetrics metrics={prData}/>
      </div>

      {/* Row 3: Top repos + Language breakdown + Goal tracker */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TopRepos />
        <LanguageBreakdown />
        <GoalTracker goals={goalsData?.goals || []}/>
      </div>
    </div>
  );
}
