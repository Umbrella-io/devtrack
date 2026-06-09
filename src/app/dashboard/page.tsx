import TodayFocusHero from "@/components/TodayFocusHero";
import DashboardHeader from "@/components/DashboardHeader";
import ExportButton from "@/components/ExportButton";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import DashboardSSEProvider from "@/components/DashboardSSEProvider";
import StreakAtRiskBanner from "@/components/StreakAtRiskBanner";
import ThrottleBanner from "@/components/ThrottleBanner";
import CustomizableDashboard from "@/components/dashboard/CustomizableDashboard";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/");

  return (
    <DashboardSSEProvider>
      <div className="min-h-screen bg-[var(--background)] px-4 py-8 text-[var(--foreground)] transition-colors sm:px-6 lg:px-8 max-w-[1600px] mx-auto">
        <DashboardHeader />

        {/* Quick actions */}
        <div className="mt-8 mb-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Left side actions */}
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <Link
              href="/wrapped"
              className="inline-flex w-full sm:w-auto justify-center items-center gap-2 rounded-xl border border-[var(--accent)] bg-[var(--accent)]/10 px-5 py-2.5 text-sm font-semibold text-[var(--accent)] shadow-sm shadow-[var(--accent)]/20 transition-all hover:bg-[var(--accent)]/20 hover:scale-[1.02]"
            >
              Year in Code
            </Link>

            <Link
              href="/dashboard/settings"
              className="inline-flex w-full sm:w-auto justify-center items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium transition-all hover:bg-white/10 hover:scale-[1.02]"
            >
              Settings
            </Link>
          </div>

          <div className="w-full sm:w-auto">
            <ExportButton />
          </div>
        </div>

        <div className="space-y-4 mb-8">
          <ThrottleBanner />
          <StreakAtRiskBanner />
        </div>

        <section className="mt-8">
          <TodayFocusHero userName={session.user?.name ?? null} />
        </section>

        <section className="mt-14">
          <div className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-gradient-to-r from-violet-950/20 via-indigo-950/10 to-transparent p-6 shadow-lg flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold text-violet-400 tracking-wider px-2 py-0.5 rounded bg-violet-500/10 border border-violet-500/20">
                  New Feature
                </span>
                <span className="text-xs text-[var(--muted-foreground)]">
                  AI Resume Generator
                </span>
              </div>

              <h3 className="text-lg font-bold text-[var(--foreground)]">
                Generate an ATS-Friendly CV Backed by Your Real Code
              </h3>

              <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                Analyze your GitHub contributions, merged PRs, and lines of code
                changed to automatically generate professional bullet points for
                your target roles.
              </p>
            </div>

            <Link
              href="/dashboard/career-intelligence"
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-500/20 hover:scale-[1.03] transition-all whitespace-nowrap"
            >
              Build Resume
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <CustomizableDashboard />
      </div>
    </DashboardSSEProvider>
  );
}