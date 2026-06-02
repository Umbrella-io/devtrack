"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ReactNode } from "react";

async function hasActiveSession(fetcher: typeof window.fetch) {
  try {
    const response = await fetcher("/api/auth/session", { cache: "no-store" });
    if (!response.ok) return false;

    const session = await response.json();
    return Boolean(session?.user || session?.githubId || session?.accessToken);
  } catch {
    return false;
  }
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { status } = useSession({
    required: true,
    onUnauthenticated() {
      router.push("/");
    },
  });

  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      if (response.status === 401) {
        const cloned = response.clone();

        // Check if this is a token_expired response from a metrics route.
        // These mean the GitHub OAuth token was revoked — the NextAuth session
        // itself is still valid, so we dispatch an event for the reconnect
        // banner rather than signing out.
        let body: Record<string, unknown> | null = null;
        try {
          body = await response.clone().json();
        } catch {
          // Non-JSON 401 — fall through to session check.
        }
        if (body?.error === "token_expired") {
          window.dispatchEvent(new CustomEvent("github-token-expired"));
          return cloned;
        }

        const sessionStillActive = await hasActiveSession(originalFetch);

        if (!sessionStillActive) {
          toast.error("Session expired. Please sign in again.");
          await signOut({ redirect: false });
          router.push("/auth/signin");
        }

        return cloned;
      }
      return response;
    };
    return () => {
      window.fetch = originalFetch;
    };
  }, [router]);

  if (status === "loading") return null;

  return <>{children}</>;
}
