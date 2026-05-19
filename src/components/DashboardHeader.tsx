"use client"

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import AccountToggle from "@/components/AccountToggle";
import SignOutButton from "@/components/SignOutButton";
import ThemeToggle from "@/components/ThemeToggle";
import UserAvatar from "@/components/UserAvatar";
import KeyboardShortcuts from "@/components/KeyboardShortcuts";

export default function DashboardHeader() {
  const { data: session } = useSession();

  const [isPublic, setIsPublic] = useState<boolean | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);


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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  async function handleSync() {
    if (syncing) return;
    setSyncing(true);
    setAnnouncement("");

    try {
      const res = await fetch("/api/metrics/contributions?days=30");
      if (!res.ok) throw new Error("Sync failed");
      setAnnouncement("Metrics refreshed successfully");
    } catch {
      setAnnouncement("Sync failed. Please try again.");
    } finally {
      setSyncing(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setAnnouncement(""), 3000);
    }
  }

  return (
    <header className="mb-8 border-b border-[var(--border)] p-4 pb-6">
      {/* Visually hidden aria-live region for screen readers */}
      <span
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </span>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[var(--foreground)]">
            Dashboard
          </h1>
          <p className="mt-1 text-[var(--muted-foreground)]">
            Your coding activity at a glance
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">

          {isPublic === true && session?.githubLogin && (
            <a
              href={`/u/${session.githubLogin}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--control)] text-[var(--card-foreground)] text-sm font-medium hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] transition-colors"
              title="View your public profile"
            >
              Share Profile
            </a>
          )}
          
          <KeyboardShortcuts />

          {/* Sync button */}
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            aria-label="Sync metrics"
            className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--control)] text-[var(--card-foreground)] text-sm font-medium hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] transition-colors disabled:opacity-50"
          >
            {syncing ? "Syncing..." : "Sync"}
          </button>

          <UserAvatar />
          <ThemeToggle />
          <SignOutButton />
        </div>
      </div>

      <AccountToggle />
    </header>
  );
}
