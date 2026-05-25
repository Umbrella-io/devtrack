"use client";

import AccountToggle from "@/components/AccountToggle";
import KeyboardShortcuts from "@/components/KeyboardShortcuts";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import AccountToggle from "@/components/AccountToggle";
import KeyboardShortcuts from "@/components/KeyboardShortcuts";
import SignOutButton from "@/components/SignOutButton";
import ThemeToggle from "@/components/ThemeToggle";
import UserAvatar from "@/components/UserAvatar";

interface UserSettings {
  is_public: boolean;
}

export default function DashboardHeader() {
  const { data: session, status } = useSession();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [totalCommits, setTotalCommits] = useState<number | null>(null);
  const [isLoadingCommits, setIsLoadingCommits] = useState(false);

  useEffect(() => {
    if (!session) return;

    async function loadSettings() {
      try {
        const res = await fetch("/api/user/settings");
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
      }
    }

    loadSettings();
  }, [session]);

  useEffect(() => {
    if (status !== "authenticated") {
      setTotalCommits(null);
      setIsLoadingCommits(false);
      return;
    }

    const controller = new AbortController();

    async function loadCommits() {
      setIsLoadingCommits(true);

      try {
        const res = await fetch("/api/metrics/contributions?days=30", {
          signal: controller.signal,
        });

        if (!res.ok) {
          setTotalCommits(null);
          return;
        }

        const data = (await res.json()) as { total?: number };
        setTotalCommits(typeof data.total === "number" ? data.total : null);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setTotalCommits(null);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingCommits(false);
        }
      }
    }

    loadCommits();

    return () => controller.abort();
  }, [status]);

  return (
<<<<<<< feat/profile-management
    <header className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] p-4 pb-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)] md:text-3xl">
          Dashboard
        </h1>
        <p className="mt-1 text-[var(--muted-foreground)]">
          Your coding activity at a glance
        </p>
        <AccountToggle />
=======
    <header className="mb-8 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 md:p-6 transition-colors duration-300">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">

        {/* Left Section */}
        <div>
          <p
            className="text-xs font-medium text-[var(--accent)] mb-1 tracking-widest uppercase"
            style={{ fontFamily: "var(--font-jetbrains, ui-monospace, monospace)", letterSpacing: "0.12em" }}
          >
            ▲ DEVTRACK
          </p>
          <h1
            className="text-3xl md:text-4xl font-extrabold text-[var(--foreground)]"
            style={{ fontFamily: "var(--font-syne, system-ui, sans-serif)", letterSpacing: "-0.03em", lineHeight: 1 }}
          >
            DASHBOARD
          </h1>
          <p
            className="mt-2 text-xs text-[var(--muted-foreground)]"
            style={{ fontFamily: "var(--font-jetbrains, ui-monospace, monospace)", letterSpacing: "0.06em" }}
          >
            coding activity at a glance
          </p>
        </div>

        {/* Right Section */}
        <div className="flex flex-wrap items-center gap-3">

          {isPublic === true && session?.githubLogin && (
            <a
              href={`/u/${session.githubLogin}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg bg-[var(--accent)] text-[var(--accent-foreground)] text-sm font-medium transition-opacity hover:opacity-90"
              style={{ fontFamily: "var(--font-jetbrains, ui-monospace, monospace)", fontSize: 12 }}
              title="View your public profile"
            >
              Share Profile
            </a>
          )}

          <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card-muted)] px-3 py-2">

            <div>
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
>>>>>>> main
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {settings?.is_public && session?.githubLogin && (
          <a
            href={`/u/${session.githubLogin}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-[var(--border)] bg-[var(--control)] px-3 py-2 text-sm font-medium text-[var(--card-foreground)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]"
            title="View your public profile"
          >
            Share Profile
          </a>
        )}
        <AccountToggle />
        <KeyboardShortcuts />
        <UserAvatar />
        {isLoadingCommits && (
          <span
            aria-hidden="true"
            className="h-10 w-32 animate-pulse rounded-full border border-[var(--border)] bg-[var(--control)]"
          />
        )}
        {!isLoadingCommits && totalCommits !== null && (
          <span className="inline-flex h-10 items-center rounded-full border border-[var(--border)] bg-[var(--control)] px-4 text-sm font-medium text-[var(--card-foreground)] shadow-sm">
            {totalCommits.toLocaleString()} commits
          </span>
        )}
        <KeyboardShortcuts />
        <ThemeToggle />
        <SignOutButton />
      </div>
    </header>
  );
}
