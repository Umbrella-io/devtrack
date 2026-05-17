import DashboardHeader from "@/components/DashboardHeader";
import StreakAtRiskBanner from "@/components/StreakAtRiskBanner";
import ExportButton from "@/components/ExportButton";
import Link from "next/link";
import PersonalRecords from "@/components/PersonalRecords";
import DashboardClient from "@/components/DashboardClient";
import WeeklySummaryCard from "@/components/WeeklySummaryCard";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/");

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

      <div className="mb-6">
        <WeeklySummaryCard />
      </div>

      <div className="mb-6">
        <PersonalRecords />
      </div>

      <DashboardClient />
    </div>
  );
}
