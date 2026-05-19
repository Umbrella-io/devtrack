"use client";

import React, { useState, useEffect, useRef } from "react";

interface BadgeSectionProps {
  username: string;
}

/**
 * Badge section component for embedding badges in README
 */
export default function BadgeSection({ username }: BadgeSectionProps) {
  // Relative URLs for preview images — always correct regardless of env vars
  const encodedUsername = encodeURIComponent(username);
  const streakBadgePreviewUrl = `/api/badge/streak-shield?user=${encodedUsername}`;
  const commitsBadgePreviewUrl = `/api/badge/commits?user=${encodedUsername}`;

  // Absolute URLs for copy markdown — resolved on client only to avoid hydration mismatch
  const [baseUrl, setBaseUrl] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setBaseUrl(window.location.origin);

    return () => {
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const showToast = () => {
    setToastVisible(true);
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = window.setTimeout(() => {
      setToastVisible(false);
      toastTimeoutRef.current = null;
    }, 2000);
  };

  const streakBadgeUrl = baseUrl
    ? `${baseUrl}/api/badge/streak-shield?user=${encodedUsername}`
    : streakBadgePreviewUrl;
  const commitsBadgeUrl = baseUrl
    ? `${baseUrl}/api/badge/commits?user=${encodedUsername}`
    : commitsBadgePreviewUrl;

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
          <div className="mb-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={streakBadgePreviewUrl} alt="DevTrack Streak" />
          </div>
          <CopyableCodeBlock code={streakMarkdown} onCopySuccess={showToast} />
        </div>

        {/* Commits Badge */}
        <div>
          <h3 className="mb-2 font-medium text-[var(--card-foreground)] text-sm">
            Commits Badge
          </h3>
          <div className="mb-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={commitsBadgePreviewUrl} alt="DevTrack Commits" />
          </div>
          <CopyableCodeBlock code={commitsMarkdown} onCopySuccess={showToast} />
        </div>

        {/* Combined */}
        <div>
          <h3 className="mb-2 font-medium text-[var(--card-foreground)] text-sm">
            Combined (Both Badges)
          </h3>
          <div className="mb-2 flex gap-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={streakBadgePreviewUrl} alt="DevTrack Streak" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={commitsBadgePreviewUrl} alt="DevTrack Commits" />
          </div>
          <CopyableCodeBlock code={combinedMarkdown} onCopySuccess={showToast} />
        </div>
      </div>

      {toastVisible && (
        <div
          role="status"
          aria-live="polite"
          className="fixed left-1/2 bottom-6 z-50 -translate-x-1/2 rounded-full bg-[var(--foreground)] px-4 py-3 text-sm text-[var(--background)] shadow-lg"
        >
          Badge markdown copied to clipboard
        </div>
      )}

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
function CopyableCodeBlock({
  code,
  onCopySuccess,
}: {
  code: string;
  onCopySuccess?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      onCopySuccess?.();
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="flex items-center justify-between rounded-lg bg-[var(--control)] p-3 border border-[var(--border)]">
      <code className="flex-1 text-xs text-[var(--card-foreground)] overflow-auto scrollbar-thin">
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