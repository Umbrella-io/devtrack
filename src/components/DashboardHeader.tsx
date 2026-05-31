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
  const [greeting, setGreeting] = useState<string>("Welcome back");

  // Determine the user's personalized greeting string based on local timestamp metrics
  useEffect(() => {
    const computeCurrentGreeting = () => {
      const currentHour = new Date().getHours();
      
      if (currentHour >= 5 && currentHour < 12) {
        return "Good morning ☀️";
      } else if (currentHour >= 12 && currentHour < 17) {
        return "Good afternoon 🌤️";
      } else if (currentHour >= 17 && currentHour < 22) {
        return "Good evening 🌙";
      } else {
        return "Burning the midnight oil 🦉";
      }
    };

    setGreeting(computeCurrentGreeting());
  }, []);
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

  // Extract a fallback username parameter from active session data strings
  const displayName = session?.user?.name || session?.githubLogin || "Developer";
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
    <header className="relative mb-8 overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)]/95 p-5 shadow-[var(--shadow-soft)] backdrop-blur-md transition-all duration-300 hover:shadow-[var(--shadow-medium)] md:p-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/40 to-transparent" />
      <div className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-[var(--accent)]/10 blur-3xl" />
      <div className="flex min-w-0 flex-col gap-5 md:flex-row md:items-end md:justify-between">

        {/* Left Section */}
        <div>
          <div className="flex flex-col gap-1">
            {/* Dynamic Personalized Friendly Greeting Badge Element Overlay */}
            <div className="inline-flex items-center gap-1.5 self-start rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20 px-2.5 py-0.5 text-xs font-semibold text-[var(--accent)] transition-all duration-300">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--accent)]"></span>
              </span>
              <span>
                {greeting}, {displayName}!
              </span>
            </div>

            <h1 className="bg-gradient-to-r from-[var(--foreground)] via-[var(--foreground)] to-[var(--accent)] bg-clip-text text-3xl font-extrabold text-transparent md:text-4xl mt-1">
              Dashboard
            </h1>
          </div>

          <p className="mt-2 text-sm md:text-base text-[var(--muted-foreground)]">
            Your coding activity at a glance 🚀
        <div className="min-w-0">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--muted-foreground)]"
            style={{ fontFamily: "var(--font-jetbrains, ui-monospace, monospace)" }}
          >
            Dashboard overview
          </p>
          <h1 className="mt-2 bg-gradient-to-r from-[var(--foreground)] via-[var(--foreground)] to-[var(--accent)] bg-clip-text text-3xl font-extrabold text-transparent md:text-4xl">
            Dashboard
          </h1>
          <p
            className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted-foreground)]"
            style={{ fontFamily: "var(--font-jetbrains, ui-monospace, monospace)", letterSpacing: "0.06em" }}
          >
            coding activity at a glance
          </p>
          {minutesAgo !== null && (
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              {minutesAgo <= 0 ? "Synced just now" : `Synced ${minutesAgo} min ago`}
            </p>
          )}
        </div>

        {/* Right Section */}
        <div className="flex min-w-0 flex-col gap-3 sm:items-end">
          <div className="flex flex-wrap items-center gap-3">
            {isPublic === true && session?.githubLogin && (
              <a
                href={`/u/${session.githubLogin}`}
                target="_blank"
                rel="noopener noreferrer"
                className="primary-button inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold"
                title="View your public profile"
              >
                Share Profile
              </a>
            )}

            <div className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card-muted)]/50 p-2 shadow-sm backdrop-blur-sm">
              <div className="transition-transform duration-200 hover:scale-[1.05]">
                <KeyboardShortcuts />
              </div>

              <div className="transition-transform duration-200 hover:scale-[1.05]">
                <NotificationBell />
              </div>

              <div className="transition-transform duration-200 hover:scale-[1.05]">
                <UserAvatar />
              </div>

              <div className="transition-transform duration-200 hover:rotate-12">
                <ThemeToggle />
              </div>

              <div className="transition-transform duration-200 hover:scale-[1.05]">
                <SignOutButton />
              </div>
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
