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
import { Moon, Sun } from "lucide-react"; 

import { toast } from "sonner";
import Link from "next/link";

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
  
  const [isNightOwl, setIsNightOwl] = useState<boolean>(false);
  const [isEarlyBird, setIsEarlyBird] = useState<boolean>(false);
  const [copied, setCopied] = useState(false);
  const { lastSynced } = useDashboardSync();
  const [now, setNow] = useState(() => Date.now());

  // Determine the user's personalized greeting string based on local timestamp metrics
  useEffect(() => {
    const computeCurrentGreeting = () => {
      const currentHour = new Date().getHours();
      if (currentHour >= 5 && currentHour < 12) return "Good morning ☀️";
      if (currentHour >= 12 && currentHour < 17) return "Good afternoon 🌤️";
      if (currentHour >= 17 && currentHour < 22) return "Good evening 🌙";
      return "Burning the midnight oil 🦉";
    };
    setGreeting(computeCurrentGreeting());
  }, []);

  useEffect(() => {
    if (!session?.githubLogin) return;

    async function evaluateCodingDistributionMilestones() {
      try {
        const res = await fetch("/api/metrics/repos?days=90");
        if (!res.ok) return;
        
        const data = await res.json();
        const commitsArray = data.repos || [];

        let nightOwlCommitsCount = 0;
        let earlyBirdCommitsCount = 0;

        commitsArray.forEach((repo: any) => {
          if (repo.last_commit_date) {
            const commitHour = new Date(repo.last_commit_date).getHours();
            if (commitHour >= 0 && commitHour <= 4) nightOwlCommitsCount++;
            if (commitHour >= 5 && commitHour <= 8) earlyBirdCommitsCount++;
          }
        });

        if (nightOwlCommitsCount >= 1) setIsNightOwl(true);
        if (earlyBirdCommitsCount >= 1) setIsEarlyBird(true);
      } catch (err) {
        console.error("Failed to compile milestone hour distribution profiles:", err);
      }
    }

    evaluateCodingDistributionMilestones();
  }, [session]);

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

  const displayName = session?.user?.name || session?.githubLogin || "Developer";
  const minutesAgo = lastSynced
    ? Math.floor((now - lastSynced.getTime()) / 60000)
    : null;

  return (
    <header className="relative mb-8 overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)]/95 p-5 shadow-[var(--shadow-soft)] backdrop-blur-md transition-all duration-300 hover:shadow-[var(--shadow-medium)] md:p-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/40 to-transparent" />
      <div className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-[var(--accent)]/10 blur-3xl" />
      <div className="flex min-w-0 flex-col gap-5 md:flex-row md:items-end md:justify-between">

        {/* Left Section */}
        <div className="min-w-0">
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20 px-2.5 py-0.5 text-xs font-semibold text-[var(--accent)] transition-all duration-300">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--accent)]"></span>
                </span>
                <span>
                  {greeting}, {displayName}!
                </span>
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

            <p
              className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--muted-foreground)] mt-2"
              style={{ fontFamily: "var(--font-jetbrains, ui-monospace, monospace)" }}
            >
              Dashboard overview
            </p>
            <h1 className="mt-1 bg-gradient-to-r from-[var(--foreground)] via-[var(--foreground)] to-[var(--accent)] bg-clip-text text-3xl font-extrabold text-transparent md:text-4xl">
              Dashboard
            </h1>
          </div>

          <p
            className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted-foreground)]"
            style={{ fontFamily: "var(--font-jetbrains, ui-monospace, monospace)", letterSpacing: "0.06em" }}
          >
            coding activity at a glance 🚀
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
              <>
                <Link
                  href={`/u/${session.githubLogin}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="primary-button inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold"
                  title="View your public profile"
                >
                  Share Profile
                </Link>
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

            {/* Grid Layout containing control elements */}
            <div className="grid w-full grid-cols-2 gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card-muted)]/50 p-3 shadow-sm backdrop-blur-sm sm:w-auto sm:grid-cols-6 sm:gap-3">
              
              <div className="justify-self-stretch transition-transform duration-200 hover:scale-[1.02] sm:justify-self-start">
                <KeyboardShortcuts />
              </div>

              <div className="justify-self-stretch transition-transform duration-200 hover:scale-[1.02] sm:justify-self-start">
                <NotificationBell />
              </div>

              <div className="justify-self-stretch transition-transform duration-200 hover:scale-[1.02] sm:justify-self-start">
                <UserAvatar />
              </div>

              <div className="justify-self-stretch transition-transform duration-200 hover:rotate-12 sm:justify-self-start">
                <ThemeToggle />
              </div>

              {/* Settings link — opens the weekly digest opt-in page */}
              <div className="justify-self-stretch transition-transform duration-200 hover:scale-[1.02] sm:justify-self-start">
                <Link
                  href="/settings"
                  title="Settings"
                  className="flex h-full items-center justify-center rounded-xl p-1.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--card)] transition-colors duration-200"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                </Link>
              </div>

              <div className="justify-self-stretch transition-transform duration-200 hover:scale-[1.02] sm:justify-self-start">
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