"use client";

import React, { useState } from "react";

interface BadgeSectionProps {
  username: string;
}

/**
 * Badge section component for embedding badges in README
 */
export default function BadgeSection({ username }: BadgeSectionProps) {
  const baseUrl = typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://devtrack.app";

  const streakBadgeUrl = `${baseUrl}/api/badge/streak?user=${username}`;
  const commitsBadgeUrl = `${baseUrl}/api/badge/commits?user=${username}`;

  const streakMarkdown = `![DevTrack Streak](${streakBadgeUrl})`;
  const commitsMarkdown = `![DevTrack Commits](${commitsBadgeUrl})`;
  const combinedMarkdown = `${streakMarkdown} ${commitsMarkdown}`;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-[var(--card-foreground)]">
        📌 Get Your Badge
      </h2>
      <p className="mb-4 text-sm text-[var(--muted-foreground)]">
        Show off your DevTrack stats on your GitHub profile! Copy and paste the markdown below into your README.
      </p>

      <div className="space-y-4">
        {/* Streak Badge */}
        <div>
          <h3 className="mb-2 font-medium text-[var(--card-foreground)] text-sm">
            Streak Badge
          </h3>
          <CopyableCodeBlock code={streakMarkdown} />
          <p className="mt-2 text-xs text-[var(--muted-foreground)]">
            Preview: Display your current commit streak
          </p>
        </div>

        {/* Commits Badge */}
        <div>
          <h3 className="mb-2 font-medium text-[var(--card-foreground)] text-sm">
            Commits Badge
          </h3>
          <CopyableCodeBlock code={commitsMarkdown} />
          <p className="mt-2 text-xs text-[var(--muted-foreground)]">
            Preview: Show commits from this month
          </p>
        </div>

        {/* Combined */}
        <div>
          <h3 className="mb-2 font-medium text-[var(--card-foreground)] text-sm">
            Combined (Both Badges)
          </h3>
          <CopyableCodeBlock code={combinedMarkdown} />
          <p className="mt-2 text-xs text-[var(--muted-foreground)]">
            Preview: Show both stats side-by-side
          </p>
        </div>
      </div>

      <div className="mt-4 p-3 rounded-lg bg-[var(--accent)]/10 border border-[var(--accent)]/20">
        <p className="text-xs text-[var(--card-foreground)]">
          <span className="font-semibold">💡 Tip:</span> Badges are cached for 1 hour and update automatically. Public data only (no authentication needed).
        </p>
      </div>
    </div>
  );
}

/**
 * Copyable code block component
 */
function CopyableCodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="flex items-center justify-between rounded-lg bg-[var(--control)] p-3 border border-[var(--border)]">
      <code className="flex-1 text-xs text-[var(--card-foreground)] overflow-auto">
        {code}
      </code>
      <button
        onClick={handleCopy}
        className="ml-2 shrink-0 px-2 py-1 text-xs font-medium rounded bg-[var(--accent)] text-[var(--accent-foreground)] hover:opacity-90 transition-opacity"
      >
        {copied ? "✓ Copied!" : "Copy"}
      </button>
    </div>
  );
}
