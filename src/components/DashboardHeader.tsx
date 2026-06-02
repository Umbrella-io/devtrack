"use client";

import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";

import { useSession } from "next-auth/react";
import { Moon, Sun } from "lucide-react";
import { toast } from "sonner";

import NotificationBell from "@/components/NotificationBell";
import AccountToggle from "@/components/AccountToggle";
import SignOutButton from "@/components/SignOutButton";
import ThemeToggle from "@/components/ThemeToggle";
import UserAvatar from "@/components/UserAvatar";
import KeyboardShortcuts from "@/components/KeyboardShortcuts";

/* -------------------- SYNC CONTEXT -------------------- */

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

  if (input instanceof URL) return input.pathname;

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

/* -------------------- HEADER -------------------- */

export default function DashboardHeader() {
  const { data: session } = useSession();

  const [isPublic, setIsPublic] = useState<boolean | null>(null);
  const [greeting, setGreeting] = useState<string>("Welcome back");
  const [copied, setCopied] = useState(false);

  const [isNightOwl, setIsNightOwl] = useState(false);
  const [isEarlyBird, setIsEarlyBird] = useState(false);

  const { lastSynced } = useDashboardSync();
  const [now, setNow] = useState(Date.now());

  const displayName =
    session?.user?.name || session?.githubLogin || "Developer";

  /* ---------------- GREETING ---------------- */

  useEffect(() => {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 12) setGreeting("Good morning ☀️");
    else if (hour >= 12 && hour < 17) setGreeting("Good afternoon 🌤️");
    else if (hour >= 17 && hour < 22) setGreeting("Good evening 🌙");
    else setGreeting("Burning the midnight oil 🦉");
  }, []);

  /* ---------------- CHRONO MILESTONES ---------------- */

  useEffect(() => {
    if (!session?.githubLogin) return;

    async function run() {
      try {
        const res = await fetch("/api/metrics/repos?days=90");
        if (!res.ok) return;

        const data = await res.json();
        const repos = data.repos || [];

        let night = 0;
        let early = 0;

        repos.forEach((repo: any) => {
          if (!repo.last_commit_date) return;

          const h = new Date(repo.last_commit_date).getHours();
          if (h >= 0 && h <= 4) night++;
          if (h >= 5 && h <= 8) early++;
        });

        if (night > 0) setIsNightOwl(true);
        if (early > 0) setIsEarlyBird(true);
      } catch (err) {
        console.error(err);
      }
    }

    run();
  }, [session]);
<<<<<<< feat/dashboard-widget-layout-v4

  /* ---------------- PUBLIC PROFILE ---------------- */
=======
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    if (!session?.githubLogin) return;
    const profileUrl = `${window.location.origin}/u/${session.githubLogin}`;
    navigator.clipboard.writeText(profileUrl).then(() => {
      setCopied(true);
      toast.success("Profile link copied!");
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      toast.error("Failed to copy link");
    });
  };

  const { lastSynced } = useDashboardSync();
  const [now, setNow] = useState(() => Date.now());
>>>>>>> main

  useEffect(() => {
    if (!session) return;

    async function load() {
      try {
        const res = await fetch("/api/user/settings");
        const data = await res.json();
        setIsPublic(data.is_public === true);
      } catch {
        setIsPublic(false);
      }
    }

    load();
  }, [session]);

  /* ---------------- SYNC TIMER ---------------- */

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

  /* ---------------- COPY PROFILE ---------------- */

  const handleCopyLink = () => {
    if (!session?.githubLogin) return;

    const url = `${window.location.origin}/u/${session.githubLogin}`;

    navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopied(true);
        toast.success("Profile link copied!");
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => toast.error("Failed to copy link"));
  };

  /* ---------------- UI ---------------- */

  return (
<<<<<<< feat/dashboard-widget-layout-v4
    <header className="relative mb-8 overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)]/95 p-5 shadow-[var(--shadow-soft)] backdrop-blur-md md:p-6">

      {/* LEFT */}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">

        <div className="flex flex-col gap-2">

          {/* Greeting row */}
          <div className="flex flex-wrap items-center gap-2">

            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20 px-3 py-1 text-xs font-semibold text-[var(--accent)]">
              <span className="h-2 w-2 rounded-full bg-[var(--accent)] animate-pulse" />
              {greeting}, {displayName}
            </div>

            {isNightOwl && (
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 px-2 py-0.5 text-xs text-indigo-400">
                <Moon className="h-3 w-3" />
                Night Owl
              </span>
            )}

            {isEarlyBird && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-xs text-amber-400">
                <Sun className="h-3 w-3" />
                Early Bird
              </span>
            )}

          </div>

          {/* Title */}
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-[var(--foreground)] to-[var(--accent)] bg-clip-text text-transparent">
            Dashboard
          </h1>

          {/* Subtitle */}
          <p className="text-sm text-[var(--muted-foreground)]">
            Your coding activity at a glance 🚀
          </p>

          {minutesAgo !== null && (
            <p className="text-xs text-[var(--muted-foreground)]">
              {minutesAgo <= 0
                ? "Synced just now"
                : `Synced ${minutesAgo} min ago`}
            </p>
          )}
=======
    <header className="relative mb-8 overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)]/95 p-5 shadow-[var(--shadow-soft)] backdrop-blur-md transition-all duration-300 hover:shadow-[var(--shadow-medium)] md:p-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/40 to-transparent" />
      <div className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-[var(--accent)]/10 blur-3xl" />
      <div className="flex min-w-0 flex-col gap-5 md:flex-row md:items-end md:justify-between">

        {/* Left Section */}
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20 px-2.5 py-0.5 text-xs font-semibold text-[var(--accent)] transition-all duration-300">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--accent)]"></span>
              </span>
              <span>{greeting}, {displayName}!</span>
            </div>
            {isNightOwl && (
              <div
                title="Night Owl Milestone: You push code between Midnight and 4 AM!"
                className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 px-2 py-0.5 text-[11px] font-bold text-indigo-400 transition-all duration-300 hover:bg-indigo-500/20 cursor-help"
              >
                <Moon className="h-3 w-3 shrink-0 text-indigo-400" />
                <span>Night Owl</span>
              </div>
            )}
            {isEarlyBird && (
              <div
                title="Early Bird Milestone: You push code between 5 AM and 8 AM!"
                className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[11px] font-bold text-amber-400 transition-all duration-300 hover:bg-amber-500/20 cursor-help"
              >
                <Sun className="h-3 w-3 shrink-0 text-amber-400" />
                <span>Early Bird</span>
              </div>
            )}
          </div>
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
        </div>

        {/* Right Section */}
        <div className="flex min-w-0 flex-col gap-3 sm:items-end">
          <div className="flex flex-wrap items-center gap-3">
            {isPublic === true && session?.githubLogin && (
              <>
                <a
                  href={`/u/${session.githubLogin}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="primary-button inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold"
                  title="View your public profile"
                >
                  Share Profile
                </a>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  title="Copy profile link to clipboard"
                  aria-label="Copy profile link"
                  className="rounded-xl border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--control-hover)] px-3 py-2 text-sm font-medium text-[var(--foreground)] transition-all active:scale-95 whitespace-nowrap"
                >
                  {copied ? "Copied! ✓" : "Copy Link 📋"}
                </button>
              </>
            )}

            <div className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card-muted)]/50 p-2 shadow-sm backdrop-blur-sm">
              <div className="transition-transform duration-200 hover:scale-[1.05]">
                <KeyboardShortcuts />
              </div>
>>>>>>> main

        </div>

        {/* RIGHT */}
        <div className="flex flex-col gap-3 sm:items-end">

          {isPublic && session?.githubLogin && (
            <div className="flex gap-2">
              <a
                href={`/u/${session.githubLogin}`}
                target="_blank"
                className="rounded-xl px-4 py-2 text-sm font-semibold bg-[var(--accent)] text-white"
              >
                Share Profile
              </a>

              <button
                onClick={handleCopyLink}
                className="rounded-xl border px-3 py-2 text-sm"
              >
                {copied ? "Copied ✓" : "Copy Link"}
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 rounded-2xl border p-2">
            <KeyboardShortcuts />
            <NotificationBell />
            <UserAvatar />
            <ThemeToggle />
            <SignOutButton />
          </div>

        </div>
      </div>

      {/* ACCOUNT */}
      <div className="mt-5">
        <AccountToggle />
      </div>

    </header>
  );
}