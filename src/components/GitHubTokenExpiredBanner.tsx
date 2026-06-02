"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { AlertTriangle } from "lucide-react";

/**
 * Renders a full-width reconnect banner when the stored GitHub token is no
 * longer valid. Triggered by two sources:
 *   1. session.error === "TokenRevoked" — set by the 24-hour liveness check in
 *      the NextAuth JWT callback after GitHub returns 401 on /user.
 *   2. A "github-token-expired" custom event dispatched by the dashboard layout
 *      fetch interceptor when any metrics API returns { error: "token_expired" }.
 */
export default function GitHubTokenExpiredBanner() {
  const { data: session } = useSession();
  const [visible, setVisible] = useState(false);

  // Show immediately when the session is already flagged.
  useEffect(() => {
    if (session?.error === "TokenRevoked") {
      setVisible(true);
    }
  }, [session?.error]);

  // Also show when a metrics route surfaces a live 401 during this page view.
  useEffect(() => {
    function handleEvent() {
      setVisible(true);
    }
    window.addEventListener("github-token-expired", handleEvent);
    return () => window.removeEventListener("github-token-expired", handleEvent);
  }, []);

  if (!visible) return null;

  async function handleReconnect() {
    await signOut({ redirect: false });
    window.location.href = "/api/auth/signin/github?callbackUrl=/dashboard";
  }

  return (
    <div
      role="alert"
      className="mb-6 flex flex-col gap-3 rounded-xl border border-[var(--warning-border,#f59e0b)] bg-[var(--warning-muted,#fef3c7)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--warning,#d97706)]" />
        <p className="text-sm text-[var(--foreground)]">
          <span className="font-semibold">GitHub connection lost.</span>{" "}
          Your GitHub connection is no longer valid. Please reconnect your GitHub
          account to continue syncing data.
        </p>
      </div>
      <button
        type="button"
        onClick={() => void handleReconnect()}
        className="shrink-0 rounded-lg bg-[var(--warning,#d97706)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
      >
        Reconnect GitHub
      </button>
    </div>
  );
}
