"use client";

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
import { Button, buttonVariants } from "@/components/ui/button";

import { useIsMobile } from "@/hooks/useIsMobile";


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
  const t = useTranslations("dashboard");
  const { data: session } = useSession();
  const [isPublic, setIsPublic] = useState<boolean | null>(null);
  const [greeting, setGreeting] = useState<string>(t("welcomeBack"));

  const [isNightOwl, setIsNightOwl] = useState<boolean>(false);
  const [isEarlyBird, setIsEarlyBird] = useState<boolean>(false);

  const isMobile = useIsMobile();

  useEffect(() => {
    const computeCurrentGreeting = () => {
      const currentHour = new Date().getHours();
      if (currentHour >= 5 && currentHour < 12) return t("goodMorning");
      if (currentHour >= 12 && currentHour < 17) return t("goodAfternoon");
      if (currentHour >= 17 && currentHour < 22) return t("goodEvening");
      return t("midnightOil");
    };
    setGreeting(computeCurrentGreeting());
  }, [t]);

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


         commitsArray.forEach((repo: { last_commit_date?: string }) => {                                                                                                                                            
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
  

 
  const [menuOpen, setMenuOpen] = useState(false);

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
    <header className="relative mb-8 overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)]/95 p-4 shadow-[var(--shadow-soft)] backdrop-blur-md transition-all duration-300 hover:shadow-[var(--shadow-medium)] sm:p-5 md:p-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/40 to-transparent" />
      <div className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-[var(--accent)]/10 blur-3xl" />
      <div className="relative flex min-w-0  gap-5 items-end justify-between">

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
                title={t("nightOwlTitle")}
                className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 px-2 py-0.5 text-[11px] font-bold text-indigo-400 transition-all duration-300 hover:bg-indigo-500/20 cursor-help"
              >
                <Moon className="h-3 w-3 shrink-0 text-indigo-400" />
                <span>{t("nightOwl")}</span>
              </div>
            )}
            {isEarlyBird && (
              <div
                title={t("earlyBirdTitle")}
                className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[11px] font-bold text-amber-400 transition-all duration-300 hover:bg-amber-500/20 cursor-help"
              >
                <Sun className="h-3 w-3 shrink-0 text-amber-400" />
                <span>{t("earlyBird")}</span>
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--muted-foreground)]"
              style={{ fontFamily: "var(--font-jetbrains, ui-monospace, monospace)" }}
            >
              {t("overviewEyebrow")}
            </p>
            <h1 className="mt-2 bg-gradient-to-r from-[var(--foreground)] via-[var(--foreground)] to-[var(--accent)] bg-clip-text text-2xl font-extrabold text-transparent sm:text-3xl md:text-4xl">
              {t("title")}
            </h1>
            <p
              className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted-foreground)]"
              style={{ fontFamily: "var(--font-jetbrains, ui-monospace, monospace)", letterSpacing: "0.06em" }}
            >
              {t("subtitle")}
            </p>
            {minutesAgo !== null && (
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                {minutesAgo <= 0 ? t("syncedJustNow") : t("syncedMinutesAgo", { minutes: minutesAgo })}
              </p>
            )}
          </div>
        </div>

        {/* Right Section */}
        {/* Right Section */}
        <div className="w-full min-w-0 md:w-auto">
          <div className="flex w-full min-w-0 items-center gap-3 overflow-x-auto pb-1 md:w-auto md:justify-end md:overflow-visible md:pb-0">
            {isPublic === true && session?.githubLogin && (
              <a
                href={`/u/${session.githubLogin}`}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: "default" })}
                title="View your public profile"
              >
                {t("shareProfile")}
              </a>
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
      
           }
             {/* Mobile hamburger button */}
      
{isMobile &&
      <div className="flex flex-col md:flex-row justify-start items-start self-stretch">

        <div className="transition-transform duration-200 hover:scale-[1.05]">
              <SignOutButton />
        </div>
        <div className="flex flex-row">
        <div className="transition-transform duration-200 hover:scale-[1.05]">
          <NotificationBell />
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
     
     
    </div>

  }
       
</div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="mt-4 space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--card-muted)]/70 p-4 shadow-sm backdrop-blur-sm ">
          <div className="flex flex-col flex-wrap md:flex-row md:justify-evenly md:items-center">
            <div className="transition-transform duration-200 hover:scale-[1.05] ">
              <KeyboardShortcuts />
            </div>

            

            <div className="transition-transform duration-200 hover:scale-[1.05]">
              <UserAvatar />
            </div>

            <div className="transition-transform duration-200 hover:rotate-12 ">
              <ThemeToggle />
            </div>

            
          </div>

          {isPublic === true && session?.githubLogin && (
            <a
              href={`/u/${session.githubLogin}`}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "default", className: "w-full" })}
              title="View your public profile"
              onClick={() => setMenuOpen(false)}
            >
              {t("shareProfile")}
            </a>
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
