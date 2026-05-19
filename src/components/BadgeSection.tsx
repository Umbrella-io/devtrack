"use client";

import React, { useState, useEffect } from "react";

interface BadgeSectionProps {
  username: string;
}

export default function BadgeSection({ username }: BadgeSectionProps) {
  const encodedUsername = encodeURIComponent(username);

  const streakBadgePreviewUrl = `/api/badge/streak-shield?user=${encodedUsername}`;
  const commitsBadgePreviewUrl = `/api/badge/commits?user=${encodedUsername}`;

  const [baseUrl, setBaseUrl] = useState("");

  useEffect(() => {
    setBaseUrl(window.location.origin);
  }, []);

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
        Show off your DevTrack stats on your GitHub profile!
      </p>

      <div className="space-y-4">
        {/* Streak */}
        <div>
          <h3 className="mb-2 text-sm font-medium">Streak Badge</h3>
          <div className="mb-2">
            <img src={streakBadgePreviewUrl} alt="DevTrack Streak" />
          </div>
          <CopyableCodeBlock code={streakMarkdown} />
        </div>

        {/* Commits */}
        <div>
          <h3 className="mb-2 text-sm font-medium">Commits Badge</h3>
          <div className="mb-2">
            <img src={commitsBadgePreviewUrl} alt="DevTrack Commits" />
          </div>
          <CopyableCodeBlock code={commitsMarkdown} />
        </div>

        {/* Combined */}
        <div>
          <h3 className="mb-2 text-sm font-medium">Combined</h3>
          <div className="mb-2 flex gap-1">
            <img src={streakBadgePreviewUrl} alt="Streak" />
            <img src={commitsBadgePreviewUrl} alt="Commits" />
          </div>
          <CopyableCodeBlock code={combinedMarkdown} />
        </div>
      </div>
    </div>
  );
}

/* ---------------- COPY BLOCK ---------------- */

function CopyableCodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--control)] p-3">
      <code className="text-xs overflow-auto">{code}</code>

      <button
        onClick={handleCopy}
        className="ml-2 text-xs px-2 py-1 rounded bg-[var(--accent)] text-white"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}