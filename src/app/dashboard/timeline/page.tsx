import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import TimelineContainer from "@/components/dashboard/TimelineContainer";

export const metadata = {
  title: "Developer Activity Timeline — DevTrack",
  description:
    "Interactive chronological log of your GitHub activities including commits, PRs, issues, and reviews across repositories.",
};

export default async function TimelinePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/");

  return (
    <div className="min-h-screen bg-[var(--background)] px-4 py-8 text-[var(--foreground)] sm:px-6 lg:px-8 max-w-[1200px] mx-auto">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--muted-foreground)] transition hover:text-[var(--card-foreground)] hover:border-[var(--accent)]/40"
            aria-label="Back to dashboard"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            Dashboard
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">
              Developer Activity Timeline
            </h1>
            <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
              Explore your contribution patterns and track development history in real-time
            </p>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <TimelineContainer />
    </div>
  );
}
