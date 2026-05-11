import ContributionGraph from "@/components/ContributionGraph";
import PRMetrics from "@/components/PRMetrics";
import GoalTracker from "@/components/GoalTracker";
import DashboardHeader from "@/components/DashboardHeader";


export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <DashboardHeader />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ContributionGraph />
        </div>
        <div>
          <GoalTracker />
        </div>
      </div>

      <div className="mt-6">
        <PRMetrics />
      </div>
    </div>
  );
}
