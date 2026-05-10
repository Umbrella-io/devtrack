import ContributionGraph from "@/components/ContributionGraph";
import PRMetrics from "@/components/PRMetrics";
import GoalTracker from "@/components/GoalTracker";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 mt-1">Your coding activity at a glance</p>
      </header>

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
