export const dynamic = "force-dynamic";

import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import type { OrgMemberStats, OrgAnalyticsPayload } from "@/lib/orgAnalytics";

function getBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000"
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ orgName: string }>;
}): Promise<Metadata> {
  const { orgName } = await params;
  return { title: `${orgName} — Org Analytics | DevTrack` };
}

interface MiniLeaderboardProps {
  title: string;
  entries: OrgMemberStats[];
  metricLabel: string;
  metricKey: keyof Pick<OrgMemberStats, "commits" | "streak" | "mergedPRs">;
}

function MiniLeaderboard({ title, entries, metricLabel, metricKey }: MiniLeaderboardProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-soft)]">
      <div className="border-b border-[var(--border)] bg-[var(--control)] px-4 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
          {title}
        </h2>
      </div>
      <table className="w-full" aria-label={title}>
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--control)]/50 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
            <th scope="col" className="px-4 py-2 text-left">Rank</th>
            <th scope="col" className="px-4 py-2 text-left">User</th>
            <th scope="col" className="px-4 py-2 text-right">{metricLabel}</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr
              key={entry.username}
              className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--control)]/30 transition-colors"
            >
              <td className="px-4 py-2 text-sm font-bold text-[var(--card-foreground)]">
                #{entry.rank}
              </td>
              <td className="px-4 py-2">
                <div className="flex items-center gap-2">
                  <Image
                    src={entry.avatarUrl}
                    alt={`${entry.username} avatar`}
                    width={32}
                    height={32}
                    unoptimized
                    className="h-8 w-8 rounded-full border border-[var(--border)]"
                  />
                  <Link
                    href={`https://github.com/${entry.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-[var(--card-foreground)] hover:text-[var(--accent)] hover:underline"
                  >
                    @{entry.username}
                  </Link>
                </div>
              </td>
              <td className="px-4 py-2 text-right text-sm font-semibold text-[var(--card-foreground)]">
                {entry[metricKey]}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function OrgAnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgName: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { orgName } = await params;
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const baseUrl = getBaseUrl();
  const apiUrl = `${baseUrl}/api/public/org/${encodeURIComponent(orgName)}?page=${page}`;

  let payload: OrgAnalyticsPayload | null = null;
  let fetchError = false;

  try {
    const res = await fetch(apiUrl, { cache: "no-store" });
    if (!res.ok) {
      fetchError = true;
    } else {
      payload = (await res.json()) as OrgAnalyticsPayload;
    }
  } catch {
    fetchError = true;
  }

  if (fetchError || !payload) {
    return (
      <main className="min-h-screen bg-[var(--background)] px-4 py-6 text-[var(--foreground)] md:px-8">
        <div className="mx-auto max-w-6xl">
          <Link
            href="/"
            className="text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            DevTrack
          </Link>
          <div className="mt-12 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-6 py-12 text-center shadow-[var(--shadow-soft)]">
            <p className="text-base text-[var(--muted-foreground)]">
              Organization not found or no public data available.
            </p>
            <Link
              href="/"
              className="mt-4 inline-block text-sm font-medium text-[var(--accent)] hover:underline"
            >
              Back to DevTrack
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const { pagination } = payload;
  const currentPage = pagination.page;
  const totalPages = pagination.totalPages;

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-6 text-[var(--foreground)] md:px-8">
      <div className="mx-auto max-w-6xl space-y-8">

        {/* Page Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <Link
              href="/"
              className="text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              DevTrack
            </Link>
            <h1 className="mt-3 text-3xl font-bold text-[var(--foreground)] md:text-4xl">
              {payload.organization}
            </h1>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              {pagination.total} members
            </p>
          </div>
          <div className="text-sm text-[var(--muted-foreground)]">
            Generated {new Date(payload.generatedAt).toLocaleString()}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-soft)]">
            <p className="text-sm font-medium text-[var(--muted-foreground)]">Total Commits</p>
            <p className="mt-2 text-3xl font-bold text-[var(--card-foreground)]">
              {payload.totalCommits.toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-soft)]">
            <p className="text-sm font-medium text-[var(--muted-foreground)]">Active Contributors</p>
            <p className="mt-2 text-3xl font-bold text-[var(--card-foreground)]">
              {payload.activeContributors.toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-soft)]">
            <p className="text-sm font-medium text-[var(--muted-foreground)]">Total Merged PRs</p>
            <p className="mt-2 text-3xl font-bold text-[var(--card-foreground)]">
              {payload.totalMergedPRs.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Leaderboards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <MiniLeaderboard
            title="Top Streaks"
            entries={payload.topStreaks}
            metricLabel="Streak (days)"
            metricKey="streak"
          />
          <MiniLeaderboard
            title="Top Committers"
            entries={payload.topCommitters}
            metricLabel="Commits"
            metricKey="commits"
          />
          <MiniLeaderboard
            title="Top PR Contributors"
            entries={payload.topPRContributors}
            metricLabel="Merged PRs"
            metricKey="mergedPRs"
          />
        </div>

        {/* Members Table */}
        <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-soft)]">
          <div className="border-b border-[var(--border)] bg-[var(--control)] px-4 py-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
              All Members
            </h2>
          </div>

          {payload.members.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <p className="text-sm text-[var(--muted-foreground)]">
                No public members found in this organization.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full" aria-label="Organization members">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--control)]/50 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                      <th scope="col" className="px-4 py-3 text-left">Rank</th>
                      <th scope="col" className="px-4 py-3 text-left">Member</th>
                      <th scope="col" className="px-4 py-3 text-right">Commits</th>
                      <th scope="col" className="px-4 py-3 text-right">Streak</th>
                      <th scope="col" className="px-4 py-3 text-right">Merged PRs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payload.members.map((member) => (
                      <tr
                        key={member.username}
                        className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--control)]/30 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm font-bold text-[var(--card-foreground)]">
                          #{member.rank}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Image
                              src={member.avatarUrl}
                              alt={`${member.username} avatar`}
                              width={32}
                              height={32}
                              unoptimized
                              className="h-8 w-8 rounded-full border border-[var(--border)]"
                            />
                            <Link
                              href={`https://github.com/${member.username}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-medium text-[var(--card-foreground)] hover:text-[var(--accent)] hover:underline"
                            >
                              @{member.username}
                            </Link>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-[var(--card-foreground)]">
                          {member.commits.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-[var(--card-foreground)]">
                          {member.streak}d
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-[var(--card-foreground)]">
                          {member.mergedPRs.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-3">
                <p className="text-sm text-[var(--muted-foreground)]">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex gap-2">
                  {currentPage > 1 ? (
                    <Link
                      href={`?page=${currentPage - 1}`}
                      className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm font-medium text-[var(--card-foreground)] hover:bg-[var(--control)] transition-colors"
                    >
                      Previous
                    </Link>
                  ) : (
                    <span className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm font-medium text-[var(--muted-foreground)] opacity-50 cursor-not-allowed">
                      Previous
                    </span>
                  )}
                  {currentPage < totalPages ? (
                    <Link
                      href={`?page=${currentPage + 1}`}
                      className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm font-medium text-[var(--card-foreground)] hover:bg-[var(--control)] transition-colors"
                    >
                      Next
                    </Link>
                  ) : (
                    <span className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm font-medium text-[var(--muted-foreground)] opacity-50 cursor-not-allowed">
                      Next
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
