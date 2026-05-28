import Link from "next/link";

type LeaderboardTab = "streak" | "commits" | "prs";

interface LeaderboardEntry {
  rank: number;
  username: string;
  avatarUrl: string;
  profileUrl: string;
  streak: number;
  commits: number;
  prs: number;
  score: number;
}

interface LeaderboardPayload {
  generatedAt: string;
  refreshSeconds: number;
  leaders: Record<LeaderboardTab, LeaderboardEntry[]>;
}

const tabs: Array<{ id: LeaderboardTab; label: string; metric: string }> = [
  { id: "streak", label: "Streak", metric: "days" },
  { id: "commits", label: "Commits", metric: "this month" },
  { id: "prs", label: "PRs", metric: "this month" },
];

async function fetchLeaderboard(): Promise<LeaderboardPayload | null> {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000";

  try {
    const res = await fetch(`${baseUrl}/api/leaderboard`, {
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return null;
    }

    return (await res.json()) as LeaderboardPayload;
  } catch (error) {
    console.error("Failed to fetch leaderboard:", error);
    return null;
  }
}

function getMetricValue(entry: LeaderboardEntry, tab: LeaderboardTab): number {
  if (tab === "streak") return entry.streak;
  if (tab === "commits") return entry.commits;
  return entry.prs;
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const activeTab = tabs.some((tab) => tab.id === searchParams.tab)
    ? (searchParams.tab as LeaderboardTab)
    : "streak";
  const leaderboard = await fetchLeaderboard();
  const activeMeta = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];
  const rows = leaderboard?.leaders[activeTab] ?? [];

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-6 text-[var(--foreground)] md:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <Link
              href="/"
              className="text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              DevTrack
            </Link>
            <h1 className="mt-3 text-3xl font-bold text-[var(--foreground)] md:text-4xl">
              Public Leaderboard
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--muted-foreground)] md:text-base">
              Opted-in developers ranked by current streak, monthly commits,
              and monthly pull request activity.
            </p>
          </div>

          {leaderboard && (
            <div className="text-sm text-[var(--muted-foreground)]">
              Updated {new Date(leaderboard.generatedAt).toLocaleString()}
            </div>
          )}
        </div>

        <div className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)]/90 p-2 shadow-[var(--shadow-soft)]">
          {tabs.map((tab) => {
            const active = tab.id === activeTab;
            return (
              <Link
                key={tab.id}
                href={`/leaderboard?tab=${tab.id}`}
                className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
                  active
                    ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)] shadow-sm"
                    : "border-[var(--border)] bg-[var(--card)] text-[var(--card-foreground)] hover:bg-[var(--control)]"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-soft)]">
          <div className="grid grid-cols-[72px_1fr_110px_110px] border-b border-[var(--border)] bg-[var(--control)] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)] md:grid-cols-[80px_1fr_140px_140px_120px]">
            <div>Rank</div>
            <div>Contributor</div>
            <div>{activeMeta.label}</div>
            <div className="hidden md:block">Score</div>
            <div>Profile</div>
          </div>

          {!leaderboard ? (
            <div className="px-4 py-12 text-center text-sm text-[var(--muted-foreground)]">
              Leaderboard data is temporarily unavailable.
            </div>
          ) : rows.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-[var(--muted-foreground)]">
              No opted-in public profiles yet.
            </div>
          ) : (
            rows.map((entry) => (
              <div
                key={`${activeTab}-${entry.username}`}
                className="grid grid-cols-[72px_1fr_110px_110px] items-center border-b border-[var(--border)] px-4 py-4 last:border-b-0 md:grid-cols-[80px_1fr_140px_140px_120px]"
              >
                <div className="text-lg font-bold text-[var(--card-foreground)]">
                  #{entry.rank}
                </div>
                <div className="flex min-w-0 items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={entry.avatarUrl}
                    alt=""
                    className="h-10 w-10 rounded-full border border-[var(--border)]"
                  />
                  <div className="min-w-0">
                    <div
                      title={entry.username}
                      className="block max-w-[120px] truncate font-semibold text-[var(--card-foreground)] sm:max-w-[180px] md:max-w-none"
                    >
                      @{entry.username}
                    </div>
                    <div className="text-xs text-[var(--muted-foreground)]">
                      {entry.commits} commits · {entry.prs} PRs · {entry.streak}d
                      streak
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-lg font-semibold text-[var(--card-foreground)]">
                    {getMetricValue(entry, activeTab)}
                  </div>
                  <div className="text-xs text-[var(--muted-foreground)]">
                    {activeMeta.metric}
                  </div>
                </div>
                <div className="hidden text-sm font-medium text-[var(--card-foreground)] md:block">
                  {entry.score}
                </div>
                <div>
                  <Link
                    href={entry.profileUrl}
                    className="secondary-button inline-flex rounded-lg px-3 py-2 text-sm font-medium"
                  >
                    View
                  </Link>
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </main>
  );
}