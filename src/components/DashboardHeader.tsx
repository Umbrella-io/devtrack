"use client";
import React from "react";
import NotificationBell from "@/components/NotificationBell";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { useSession } from "next-auth/react";
import AccountToggle from "@/components/AccountToggle";
import SignOutButton from "@/components/SignOutButton";
import ThemeToggle from "@/components/ThemeToggle";
import UserAvatar from "@/components/UserAvatar";
import KeyboardShortcuts from "@/components/KeyboardShortcuts";

type DashboardSyncContextValue = {
  lastSynced: Date | null;
};

const DashboardSyncContext = createContext<DashboardSyncContextValue>({
  lastSynced: null,
});

function getRequestPath(input: RequestInfo | URL): string {
  if (typeof input === "string") {
    return input.startsWith("http") ? new URL(input).pathname : input;
  }

  if (input instanceof URL) {
    return input.pathname;
  }

  return new URL(input.url).pathname;
}

function isDashboardDataRequest(input: RequestInfo | URL): boolean {
  const requestPath = getRequestPath(input);

  return (
    requestPath.startsWith("/api/metrics/") ||
    requestPath === "/api/goals" ||
    requestPath.startsWith("/api/goals/") ||
    requestPath.startsWith("/api/streak/") ||
    requestPath === "/api/user/github-accounts" ||
    requestPath.startsWith("/api/badge/")
  );
}

export function DashboardSyncProvider({ children }: { children: ReactNode }) {
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  useLayoutEffect(() => {
    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      const response = await originalFetch(...args);

      if (response.ok && isDashboardDataRequest(args[0])) {
        setLastSynced(new Date());
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  const value = useMemo(() => ({ lastSynced }), [lastSynced]);

  return (
    <DashboardSyncContext.Provider value={value}>
      {children}
    </DashboardSyncContext.Provider>
  );
}

function useDashboardSync() {
  return useContext(DashboardSyncContext);
}

export default function DashboardHeader() {
  const { data: session } = useSession();
  const [isPublic, setIsPublic] = useState<boolean | null>(null);
  const { lastSynced } = useDashboardSync();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!session) {
      setIsPublic(null);
      return;
    }

    async function loadSettings() {
      try {
        const res = await fetch("/api/user/settings");

        if (res.ok) {
          const data = await res.json();
          setIsPublic(data.is_public === true);
        } else {
          setIsPublic(false);
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
        setIsPublic(false);
      }
    }

    loadSettings();
  }, [session]);

  useEffect(() => {
    if (!lastSynced) return;

    const interval = setInterval(() => {
      setNow(Date.now());
    }, 60000);

    return () => clearInterval(interval);
  }, [lastSynced]);

  const minutesAgo = lastSynced
    ? Math.floor((now - lastSynced.getTime()) / 60000)
    : null;

  return (
    <header className="mb-8 rounded-3xl border border-[var(--border)] bg-[var(--card)]/95 p-5 shadow-[var(--shadow-soft)] backdrop-blur-md transition-all duration-300 hover:shadow-[var(--shadow-medium)] md:p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">

        {/* Left Section */}
        <div>
          <h1 className="bg-gradient-to-r from-[var(--foreground)] via-[var(--foreground)] to-[var(--accent)] bg-clip-text text-3xl font-extrabold text-transparent md:text-4xl">
            Dashboard
          </h1>

          <p className="mt-2 text-sm md:text-base text-[var(--muted-foreground)]">
            Your coding activity at a glance 🚀
          </p>
          {minutesAgo !== null && (
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              {minutesAgo <= 0 ? "Synced just now" : `Synced ${minutesAgo} min ago`}
            </p>
          )}
        </div>

        {/* Right Section */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-center md:justify-end">

          {isPublic === true && session?.githubLogin && (
            <a
              href={`/u/${session.githubLogin}`}
              target="_blank"
              rel="noopener noreferrer"
              className="primary-button rounded-xl px-4 py-2 text-sm font-semibold w-full sm:w-auto text-center"
              style={{ fontFamily: "var(--font-jetbrains, ui-monospace, monospace)", fontSize: 12 }}
              title="View your public profile"
            >
              Share Profile
            </a>
          )}

          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card-muted)] px-2 py-1.5 sm:px-3 sm:py-2 max-w-full justify-center sm:justify-start">

            <div className="hover:scale-110 transition-transform duration-200">
              <KeyboardShortcuts />
            </div>

            <div className="hover:scale-110 transition-transform duration-200">
              <NotificationBell />
            </div>

            <div className="hover:scale-110 transition-transform duration-200">
              <UserAvatar />
            </div>

            <div className="hover:rotate-12 transition-transform duration-200">
              <ThemeToggle />
            </div>

            <div className="hover:scale-110 transition-transform duration-200">
              <SignOutButton />
            </div>

          </div>
        </div>
      </div>

      {/* Bottom Toggle */}
      <div className="mt-5">
        <AccountToggle />
      </div>
    </header>
  );
}
