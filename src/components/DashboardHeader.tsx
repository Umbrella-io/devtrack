"use client";
import React from "react";
import NotificationBell from "@/components/NotificationBell";
import {
  createContext,
  ReactNode,
  useCallback,
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
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { Button, buttonVariants } from "@/components/ui/button";

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
  const [lastSynced, setLastSynced] = useState<Date | null>(() => {
    const stored = localStorage.getItem("devtrack-last-synced");
    return stored ? new Date(stored) : null;
  });

  useLayoutEffect(() => {
    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      const response = await originalFetch(...args);

      if (response.ok && isDashboardDataRequest(args[0])) {
        const now = new Date();
        setLastSynced(now);
        localStorage.setItem("devtrack-last-synced", now.toISOString());
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

  // Extracted to useCallback so useRealtimeSync can call it as a stable reference.
  const loadSettings = useCallback(async () => {
    if (!session) {
      setIsPublic(null);
      return;
    }
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
  }, [session]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // -------------------------------------------------------------------------
  // Realtime: re-fetch user settings whenever the `users` row changes
  // (e.g. is_public toggled in another tab). Falls back to 60-second polling.
  // NOTE: enable Realtime for the `users` table in Supabase and ensure the
  // anon role has a SELECT policy, or provide a user-scoped filter once a
  // Supabase JWT is available in the session.
  // -------------------------------------------------------------------------
  const { isLive: isHeaderLive } = useRealtimeSync(
    "users",
    ["UPDATE"],
    loadSettings,
  );
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
  const [menuOpen, setMenuOpen] = useState(false);

  const { lastSynced } = useDashboardSync();
  const [now, setNow] = useState(() => Date.now());

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
    <header className="relative mb-8 overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)]/95 p-4 shadow-[var(--shadow-soft)] backdrop-blur-md transition-all duration-300 hover:shadow-[var(--shadow-medium)] sm:p-5 md:p-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/40 to-transparent" />
      <div className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-[var(--accent)]/10 blur-3xl" />
      <div className="relative flex min-w-0 flex-col gap-5 md:flex-row md:items-end md:justify-between">

        {/* Left Section */}
        <div className="min-w-0 pr-12 md:pr-0">
          <div className="mb-1 flex min-w-0 flex-wrap items-center gap-2">
            <div className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[var(--accent)]/20 bg-[var(--accent)]/10 px-2.5 py-0.5 text-xs font-semibold text-[var(--accent)] transition-all duration-300">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--accent)]"></span>
              </span>
              <span className="truncate">{greeting}, {displayName}!</span>
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
            <h1 className="mt-2 bg-gradient-to-r from-[var(--foreground)] via-[var(--foreground)] to-[var(--accent)] bg-clip-text text-2xl font-extrabold text-transparent sm:text-3xl md:text-4xl">
              Dashboard
            </h1>
            <p
              className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted-foreground)]"
              style={{ fontFamily: "var(--font-jetbrains, ui-monospace, monospace)", letterSpacing: "0.06em" }}
            >
              coding activity at a glance
            </p>
            {minutesAgo !== null && (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                {minutesAgo <= 0 ? "Synced just now" : `Synced ${minutesAgo} min ago`}
                {isHeaderLive && (
                  <span
                    title="Live — connected to Supabase Realtime"
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-500"
                  >
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    </span>
                    Live
                  </span>
                )}
              </p>
            )}
          </div>
        </div>

        {/* Right Section */}
        {/* Right Section */}
        <div className="w-full min-w-0 md:w-auto">
          <div className="flex w-full min-w-0 items-center gap-3 overflow-x-auto pb-1 md:w-auto md:justify-end md:overflow-visible md:pb-0">
            {session?.githubLogin && (
              <div className="flex items-center gap-2">
                {/* Copy Link Button */}
                <button
                  type="button"
                  onClick={handleCopyLink}
                  title="Copy your profile link"
                  className="flex items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--control)] px-4 py-2 text-sm font-medium text-[var(--card-foreground)] transition-all hover:border-[var(--accent)] active:scale-95"
                >
                  {copied ? (
                    <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                  {copied ? "Copied!" : "Copy Link"}
                </button>

                {/* Twitter/X Share Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (!session?.githubLogin) return;
                    const profileUrl = `${window.location.origin}/u/${session.githubLogin}`;
                    const tweet = encodeURIComponent(
                      `🔥 Check out my DevTrack stats!\n` +
                      `Track your GitHub streaks, PRs & coding goals 👇\n` +
                      `${profileUrl}\n\n#GitHub #DevTrack #GSSoC`
                    );
                    window.open(`https://twitter.com/intent/tweet?text=${tweet}`, '_blank');
                  }}
                  title="Share on X (Twitter)"
                  className="flex items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-black px-4 py-2 text-sm font-medium text-white transition-all hover:bg-zinc-800 active:scale-95"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.261 5.632 5.903-5.632Zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  Post on X
                </button>

                {/* LinkedIn Share Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (!session?.githubLogin) return;
                    const profileUrl = encodeURIComponent(
                      `${window.location.origin}/u/${session.githubLogin}`
                    );
                    window.open(
                      `https://www.linkedin.com/sharing/share-offsite/?url=${profileUrl}`,
                      '_blank'
                    );
                  }}
                  title="Share on LinkedIn"
                  className="flex items-center justify-center gap-2 rounded-lg border border-[#0A66C2]/50 bg-[#0A66C2] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[#0958a8] active:scale-95"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 23.2 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  LinkedIn
                </button>

                {isPublic === true && (
                  <a
                    href={`/u/${session.githubLogin}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonVariants({ variant: "default" })}
                    title="View your public profile"
                  >
                    Share Profile
                  </a>
                )}
              </div>
            )}

            <div className="flex shrink-0 items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card-muted)]/50 p-2 shadow-sm backdrop-blur-sm">
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

        {/* Mobile hamburger button */}
        <Button
          variant="outline"
          size="icon"
          className="self-start sm:hidden"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          {menuOpen ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path d="M4 6h16" />
              <path d="M4 12h16" />
              <path d="M4 18h16" />
            </svg>
          )}
        </Button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="mt-4 space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--card-muted)]/70 p-4 shadow-sm backdrop-blur-sm sm:hidden">
          <div className="flex flex-wrap items-center gap-2">
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

          {session?.githubLogin && (
            <div className="flex flex-col gap-2 w-full">
              <button
                type="button"
                onClick={() => { handleCopyLink(); setMenuOpen(false); }}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--control)] px-4 py-2 text-sm font-medium transition-all hover:border-[var(--accent)] active:scale-95"
              >
                {copied ? "✓ Copied!" : "Copy Profile Link"}
              </button>
              <button
                type="button"
                onClick={() => {
                  const profileUrl = `${window.location.origin}/u/${session.githubLogin}`;
                  const tweet = encodeURIComponent(`🔥 Check out my DevTrack stats!\n${profileUrl}\n\n#GitHub #DevTrack`);
                  window.open(`https://twitter.com/intent/tweet?text=${tweet}`, '_blank');
                  setMenuOpen(false);
                }}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition-all hover:bg-zinc-800 active:scale-95"
              >
                Post on X
              </button>
              {isPublic === true && (
                <a
                  href={`/u/${session.githubLogin}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({ variant: "default", className: "w-full" })}
                  onClick={() => setMenuOpen(false)}
                >
                  Share Profile
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {/* Bottom Toggle */}
      <div className="mt-5">
        <AccountToggle />
      </div>
    </header>
  );
}
