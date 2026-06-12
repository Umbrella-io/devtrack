import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import FollowerLeaderboard from "@/components/leaderboard/FollowerLeaderboard";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Follower Leaderboard · DevTrack",
  description: "See how your GitHub followers rank by streak, commits, and merged PRs.",
};

function LeaderboardSkeleton() {
  return (
    <div
      className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-12 text-center"
      aria-busy="true"
    >
      <p className="text-sm text-[var(--muted-foreground)]">Loading…</p>
    </div>
  );
}

export default async function FollowerLeaderboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.githubLogin) {
    redirect("/auth/signin");
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-6 text-[var(--foreground)] md:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <nav className="mb-2 flex items-center gap-1 text-sm text-[var(--muted-foreground)]">
            <Link href="/dashboard" className="hover:text-[var(--foreground)] transition-colors">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-[var(--foreground)]">Follower Leaderboard</span>
          </nav>
          <h1 className="text-3xl font-bold text-[var(--foreground)] md:text-4xl">
            Follower Leaderboard
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted-foreground)] md:text-base">
            Your GitHub followers ranked by streak, commits this month, and merged pull
            requests. Uses public GitHub activity only.
          </p>
        </div>

        <Suspense fallback={<LeaderboardSkeleton />}>
          <FollowerLeaderboard />
        </Suspense>
      </div>
    </main>
  );
}
