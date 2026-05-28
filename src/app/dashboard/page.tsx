import LazyWidget from "@/components/LazyWidget";
import DiscussionsWidget from "@/components/DiscussionsWidget";
import CommunityMetrics from "@/components/CommunityMetrics";
import GoalTracker from "@/components/GoalTracker";
import DashboardHeader from "@/components/DashboardHeader";
import StreakTracker from "@/components/StreakTracker";
import TopRepos from "@/components/TopRepos";
import PinnedRepos from "@/components/PinnedRepos";
import PinnedReposWidget from "@/components/PinnedReposWidget";
import InactiveRepositoriesCard from "@/components/InactiveRepositoriesCard";
import LanguageBreakdown from "@/components/LanguageBreakdown";
import CIAnalytics from "@/components/CIAnalytics";
import IssueMetrics from "@/components/IssueMetrics";
import StreakAtRiskBanner from "@/components/StreakAtRiskBanner";
import RepoAnalyticsExplorer from "@/components/repo-analytics/RepoAnalyticsExplorer";
import dynamic from "next/dynamic";

const SkeletonCard = () => (
  <div
    role="status"
    aria-busy="true"
    aria-live="polite"
    className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm"
  >
    <div className="h-6 w-48 bg-[var(--card-muted)] rounded mb-4 animate-pulse" />
    <div className="h-40 bg-[var(--card-muted)] rounded animate-pulse" />
  </div>
);

const ContributionGraphSkeleton = () => (
  <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
    <h2 className="text-lg font-semibold text-[var(--foreground)]">
      Your Commits
    </h2>
    <div className="mt-3 h-40 rounded bg-[var(--card-muted)] animate-pulse" />
  </div>
);

const PRMetricsSkeleton = () => (
  <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
    <h2 className="text-lg font-semibold text-[var(--card-foreground)]">
      PR Analytics
    </h2>
    <div className="mt-3 h-40 rounded bg-[var(--card-muted)] animate-pulse" />
  </div>
);

const CodingActivityInsightsCard = dynamic(
  () => import("@/components/CodingActivityInsightsCard"),
  { ssr: false, loading: () => <SkeletonCard /> },
);

const FriendComparison = dynamic(
  () => import("@/components/FriendComparison"),
  {
    ssr: false,
    loading: () => <SkeletonCard />,
<<<<<<< HEAD
  },
=======
  }
>>>>>>> 27751b2 (fix: remove invalid eslint directive)
);

const ActivityRingChart = dynamic(
  () => import("@/components/ActivityRingChart"),
  {
    ssr: false,
    loading: () => <SkeletonCard />,
<<<<<<< HEAD
  },
=======
  }
>>>>>>> 27751b2 (fix: remove invalid eslint directive)
);

const ContributionGraph = dynamic(
  () => import("@/components/ContributionGraph"),
  {
    ssr: false,
    loading: () => <ContributionGraphSkeleton />,
<<<<<<< HEAD
  },
=======
  }
>>>>>>> 27751b2 (fix: remove invalid eslint directive)
);

const ContributionHeatmap = dynamic(
  () => import("@/components/ContributionHeatmap"),
  {
    ssr: false,
    loading: () => <SkeletonCard />,
<<<<<<< HEAD
  },
=======
  }
>>>>>>> 27751b2 (fix: remove invalid eslint directive)
);

const PRMetrics = dynamic(() => import("@/components/PRMetrics"), {
  ssr: false,
  loading: () => <PRMetricsSkeleton />,
});

const PRBreakdownChart = dynamic(
  () => import("@/components/PRBreakdownChart"),
  {
    ssr: false,
    loading: () => <SkeletonCard />,
<<<<<<< HEAD
  },
=======
  }
>>>>>>> 27751b2 (fix: remove invalid eslint directive)
);

const CommitTimeChart = dynamic(() => import("@/components/CommitTimeChart"), {
  ssr: false,
  loading: () => <SkeletonCard />,
});

const PRReviewTrendChart = dynamic(
  () => import("@/components/PRReviewTrendChart"),
  {
    ssr: false,
    loading: () => <SkeletonCard />,
<<<<<<< HEAD
  },
=======
  }
>>>>>>> 27751b2 (fix: remove invalid eslint directive)
);
import WeeklySummaryCard from "@/components/WeeklySummaryCard";
import { AIMentorWidget } from "@/components/AIMentorWidget";
import ExportButton from "@/components/ExportButton";
import Link from "next/link";
import PersonalRecords from "@/components/PersonalRecords";
import LocalCodingTime from "@/components/LocalCodingTime";
import CodingTimeWidget from "@/components/CodingTimeWidget";
import RecentActivity from "@/components/RecentActivity";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import DashboardSSEProvider from "@/components/DashboardSSEProvider";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/");

  return (
    <DashboardSSEProvider>
      <div className="min-h-screen overflow-x-hidden bg-[var(--background)] p-4 text-[var(--foreground)] transition-colors md:p-8">
        <DashboardHeader />
        <div className="mb-6 flex flex-wrap items-stretch justify-center gap-2 sm:justify-end">
          <Link
            href="/wrapped"
            className="flex min-w-0 flex-1 items-center justify-center rounded-lg border border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-2 text-center text-sm font-semibold text-[var(--accent)] transition-opacity hover:opacity-90 sm:min-w-[140px] sm:flex-none"
          >
            Year in Code
          </Link>
          <Link
            href="/dashboard/settings"
            className="secondary-button flex min-w-0 flex-1 items-center justify-center rounded-xl px-4 py-2 text-center text-sm font-medium sm:min-w-[140px] sm:flex-none"
          >
            Settings
          </Link>
          <div className="w-full sm:w-auto">
            <ExportButton />
          </div>
        </div>
        <StreakAtRiskBanner />

        <div className="mb-6 mt-6">
          <Link href="/wrapped">
            <div className="overflow-hidden rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-fuchsia-600 p-6 shadow-lg transition-transform hover:scale-[1.01] hover:-z-0">
              <div className="relative flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    Your Year in Code is here! ✨
                  </h2>
                  <p className="mt-1 text-white/90">
                    Discover your top languages, longest streaks, and coding
                    habits of the year.
                  </p>
                </div>
                <div className="rounded-full bg-white px-6 py-2 font-bold text-purple-600">
                  View Wrapped
                </div>
              </div>
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/20 blur-3xl"></div>
              <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-black/20 blur-3xl"></div>
            </div>
          </Link>
        </div>

        <div className="mb-6">
          <WeeklySummaryCard />
        </div>

        <div className="mb-6">
          <AIMentorWidget />
        </div>

        <div className="mb-6">
          <PersonalRecords />
        </div>

        {/* Row 1: Contribution graph + Streak + Local Coding Time */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ContributionGraph />
            <div className="mt-6">
              <ContributionHeatmap />
            </div>
            <div className="mt-6">
              <FriendComparison />
            </div>
            <div className="mt-6 w-full min-w-0 overflow-hidden">
              <RepoAnalyticsExplorer />
            </div>
          </div>

<<<<<<< HEAD
        <div className="mb-6">
          <WeeklySummaryCard />
        </div>

        <div className="mb-6">
          <AIMentorWidget />
        </div>

        <div className="mb-6">
          <PersonalRecords />
        </div>

        {/* Row 1: Contribution graph + Streak + Local Coding Time */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ContributionGraph />
            <div className="mt-6">
              <LazyWidget fallback={<SkeletonCard />}>
                <ContributionHeatmap />
              </LazyWidget>
            </div>
            <div className="mt-6">
              <LazyWidget fallback={<SkeletonCard />}>
                <FriendComparison />
              </LazyWidget>
            </div>
          </div>

=======
>>>>>>> 27751b2 (fix: remove invalid eslint directive)
          <div>
            <StreakTracker />
            <LocalCodingTime />
            <div className="mt-6">
              <CodingTimeWidget />
            </div>
<<<<<<< HEAD
          </div>
          <div className="mt-6">
            <RepoAnalyticsExplorer />
=======
>>>>>>> 27751b2 (fix: remove invalid eslint directive)
          </div>
        </div>

        {/* Row 2: PR metrics, community metrics, PR breakdown & Time Chart */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <PRMetrics />
          <CommunityMetrics />
          <PRBreakdownChart />
          <CommitTimeChart />
        </div>
        {/* Row 2b: Activity Ring Chart */}
        <div className="mt-6">
          <ActivityRingChart />
        </div>

        <div className="mt-6">
          <CodingActivityInsightsCard />
        </div>

        <div className="mt-6">
<<<<<<< HEAD
          <LazyWidget fallback={<SkeletonCard />}>
            <PRReviewTrendChart />
          </LazyWidget>
=======
          <PRReviewTrendChart />
>>>>>>> 27751b2 (fix: remove invalid eslint directive)
        </div>

        {/* Row 3: Issue metrics + CI analytics */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
<<<<<<< HEAD
            <LazyWidget fallback={<SkeletonCard />}>
              <IssueMetrics />
            </LazyWidget>
          </div>
          <LazyWidget fallback={<SkeletonCard />}>
            <CIAnalytics />
          </LazyWidget>
        </div>
        {/* Row 3b: Discussion activity */}
        <div className="mt-6">
          <LazyWidget fallback={<SkeletonCard />}>
            <DiscussionsWidget />
          </LazyWidget>
        </div>

        {/* Row 4a: Custom Pinned Spotlight repositories */}
        <div className="mt-6">
          <PinnedReposWidget />
=======
            <IssueMetrics />
          </div>
          <CIAnalytics />
        </div>
        {/* Row 3b: Discussion activity */}
        <div className="mt-6">
          <DiscussionsWidget />
>>>>>>> 27751b2 (fix: remove invalid eslint directive)
        </div>

        {/* Row 4: Pinned repositories */}
        <div className="mt-6">
<<<<<<< HEAD
          <LazyWidget fallback={<SkeletonCard />}>
            <PinnedRepos />
          </LazyWidget>
=======
          <PinnedRepos />
>>>>>>> 27751b2 (fix: remove invalid eslint directive)
        </div>

        {/* Row 5: Inactive repository reminder */}
        <div className="mt-6">
<<<<<<< HEAD
          <LazyWidget fallback={<SkeletonCard />}>
            <InactiveRepositoriesCard />
          </LazyWidget>
=======
          <InactiveRepositoriesCard />
>>>>>>> 27751b2 (fix: remove invalid eslint directive)
        </div>

        {/* Row 6: Top repos + Language breakdown + Goal tracker */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
<<<<<<< HEAD
          <LazyWidget fallback={<SkeletonCard />}>
            <TopRepos />
          </LazyWidget>
          <LazyWidget fallback={<SkeletonCard />}>
            <LanguageBreakdown />
          </LazyWidget>
=======
          <TopRepos />
          <LanguageBreakdown />
>>>>>>> 27751b2 (fix: remove invalid eslint directive)
          <GoalTracker />
        </div>

        {/* Row 7: Recent GitHub activity */}
        <div className="mt-6">
<<<<<<< HEAD
          <LazyWidget fallback={<SkeletonCard />}>
            <RecentActivity />
          </LazyWidget>
=======
          <RecentActivity />
>>>>>>> 27751b2 (fix: remove invalid eslint directive)
        </div>
      </div>
    </DashboardSSEProvider>
  );
}
