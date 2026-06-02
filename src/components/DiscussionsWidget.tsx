"use client";

import { useCallback, useEffect, useState } from "react";
import { signOut } from "next-auth/react";

interface DiscussionData {
  discussionsStarted: number;
  commentsGiven: number;
  markedAsAnswer: number;
}

export default function DiscussionsWidget() {
  const [data, setData] = useState<DiscussionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [githubAuthInvalid, setGithubAuthInvalid] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    setError(null);
    setGithubAuthInvalid(false);
    fetch("/api/metrics/discussions")
      .then(async (r) => {
        const body = await r.json();
        if (body?.error === "token_expired") {
          setGithubAuthInvalid(true);
          return null;
        }
        if (!r.ok) throw new Error("API error");
        return body as DiscussionData;
      })
      .then((d) => {
        if (!d) return;
        setData(d);
      })
      .catch(() =>
        setError("We couldn't load your discussion metrics right now.")
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const stats = data
    ? [
        {
          label: "Discussions Started",
          value: data.discussionsStarted,
          title: "Total discussions you have opened",
        },
        {
          label: "Comments Given",
          value: data.commentsGiven,
          title: "Discussions you have commented on",
        },
        {
          label: "Marked as Answer",
          value: data.markedAsAnswer,
          title: "Your replies marked as the accepted answer",
        },
      ]
    : [];

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1">
      <h2 className="mb-4 text-lg font-semibold text-[var(--card-foreground)]">
        Discussion Activity
      </h2>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 rounded-lg skeleton-shimmer"
            />
          ))}
        </div>
      ) : githubAuthInvalid ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-6 text-center space-y-3">
          <p className="text-sm text-[var(--muted-foreground)]">
            Your GitHub connection is no longer valid. Reconnect your GitHub
            account to continue syncing data.
          </p>
          <button
            type="button"
            onClick={() => {
              void signOut({ redirect: false }).then(() => {
                window.location.href = "/api/auth/signin/github?callbackUrl=/dashboard";
              });
            }}
            className="inline-flex items-center rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Reconnect GitHub
          </button>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-[var(--destructive)]/20 bg-[var(--destructive)]/10 p-4 text-sm text-[var(--destructive)]">
          <p>{error}</p>
          <button
            type="button"
            onClick={fetchData}
            className="mt-3 rounded-md border border-[var(--destructive)]/30 px-3 py-1.5 text-xs font-medium text-[var(--destructive)] transition-colors hover:bg-[var(--destructive)]/10"
          >
            Try again
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 stagger-children">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg bg-[var(--control)] p-4 text-center stat-cell animate-fade-in-up"
              title={stat.title}
            >
              <div className="text-2xl font-bold text-[var(--accent)]">
                {stat.value}
              </div>
              <div className="mt-1 text-sm text-[var(--muted-foreground)]">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
