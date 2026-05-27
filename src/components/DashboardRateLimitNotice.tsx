"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  formatGitHubRateLimitMessage,
  readGitHubRateLimitDetails,
  type GitHubRateLimitDetails,
} from "@/lib/github-rate-limit";

function getResetDate(details: GitHubRateLimitDetails): Date | null {
  if (details.resetAt) {
    const resetAt = new Date(details.resetAt);
    return Number.isNaN(resetAt.getTime()) ? null : resetAt;
  }

  if (details.resetAtUnix) {
    return new Date(details.resetAtUnix * 1000);
  }

  return null;
}

export default function DashboardRateLimitNotice() {
  const [resetAt, setResetAt] = useState<Date | null>(null);
  const lastToastKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    let active = true;

    window.fetch = async (input, init) => {
      const response = await originalFetch(input, init);
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      if (!url.includes("/api/")) {
        return response;
      }

      readGitHubRateLimitDetails(response)
        .then((details) => {
          if (!active || !details) return;

          const nextResetAt = getResetDate(details);
          const toastKey = `${details.resetAtUnix ?? details.resetAt ?? "unknown"}`;
          setResetAt(nextResetAt);

          if (lastToastKeyRef.current !== toastKey) {
            lastToastKeyRef.current = toastKey;
            toast.error(details.message);
          }
        })
        .catch(() => {});

      return response;
    };

    return () => {
      active = false;
      window.fetch = originalFetch;
    };
  }, []);

  useEffect(() => {
    if (!resetAt) return;

    const msUntilReset = resetAt.getTime() - Date.now();
    if (msUntilReset <= 0) {
      setResetAt(null);
      return;
    }

    const timer = setTimeout(() => {
      setResetAt(null);
      lastToastKeyRef.current = null;
    }, msUntilReset);

    return () => clearTimeout(timer);
  }, [resetAt]);

  if (!resetAt) {
    return null;
  }

  return (
    <div
      role="status"
      className="mb-4 rounded-lg border border-[var(--warning)]/30 bg-[var(--warning)]/10 px-4 py-3 text-sm text-[var(--warning)]"
    >
      {formatGitHubRateLimitMessage(resetAt)}
    </div>
  );
}
