import Link from "next/link";

export default function Loading() {
  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-6 text-[var(--foreground)] md:px-8">
      <div className="mx-auto max-w-6xl space-y-8">

        {/* Header Skeleton */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <Link href="/" className="text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
              DevTrack
            </Link>
            <div className="mt-3 h-9 w-64 rounded-lg bg-[var(--card-muted)] animate-pulse" />
            <div className="mt-2 h-4 w-28 rounded bg-[var(--card-muted)] animate-pulse" />
          </div>
          <div className="h-4 w-48 rounded bg-[var(--card-muted)] animate-pulse" />
        </div>

        {/* Summary Cards Skeleton */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-soft)]"
            >
              <div className="h-4 w-32 rounded bg-[var(--card-muted)] animate-pulse" />
              <div className="mt-3 h-9 w-20 rounded-lg bg-[var(--card-muted)] animate-pulse" />
            </div>
          ))}
        </div>

        {/* Leaderboards Skeleton */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-soft)]"
            >
              <div className="border-b border-[var(--border)] bg-[var(--control)] px-4 py-3">
                <div className="h-4 w-28 rounded bg-[var(--card-muted)] animate-pulse" />
              </div>
              <div className="divide-y divide-[var(--border)]">
                {[1, 2, 3, 4, 5].map((j) => (
                  <div key={j} className="flex items-center gap-3 px-4 py-2">
                    <div className="h-4 w-6 rounded bg-[var(--card-muted)] animate-pulse shrink-0" />
                    <div className="h-8 w-8 rounded-full bg-[var(--card-muted)] animate-pulse shrink-0" />
                    <div className="h-4 flex-1 rounded bg-[var(--card-muted)] animate-pulse" />
                    <div className="h-4 w-10 rounded bg-[var(--card-muted)] animate-pulse shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Members Table Skeleton */}
        <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-soft)]">
          <div className="border-b border-[var(--border)] bg-[var(--control)] px-4 py-3">
            <div className="h-4 w-24 rounded bg-[var(--card-muted)] animate-pulse" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--control)]/50 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                  <th className="px-4 py-3 text-left">Rank</th>
                  <th className="px-4 py-3 text-left">Member</th>
                  <th className="px-4 py-3 text-right">Commits</th>
                  <th className="px-4 py-3 text-right">Streak</th>
                  <th className="px-4 py-3 text-right">Merged PRs</th>
                </tr>
              </thead>
              <tbody>
                {[...Array(5)].map((_, i) => (
                  <tr
                    key={i}
                    className="border-b border-[var(--border)] last:border-b-0"
                  >
                    <td className="px-4 py-3">
                      <div className="h-4 w-6 rounded bg-[var(--card-muted)] animate-pulse" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-[var(--card-muted)] animate-pulse shrink-0" />
                        <div className="h-4 w-28 rounded bg-[var(--card-muted)] animate-pulse" />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="ml-auto h-4 w-12 rounded bg-[var(--card-muted)] animate-pulse" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="ml-auto h-4 w-10 rounded bg-[var(--card-muted)] animate-pulse" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="ml-auto h-4 w-10 rounded bg-[var(--card-muted)] animate-pulse" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-3">
            <div className="h-4 w-24 rounded bg-[var(--card-muted)] animate-pulse" />
            <div className="flex gap-2">
              <div className="h-9 w-20 rounded-lg bg-[var(--card-muted)] animate-pulse" />
              <div className="h-9 w-16 rounded-lg bg-[var(--card-muted)] animate-pulse" />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
