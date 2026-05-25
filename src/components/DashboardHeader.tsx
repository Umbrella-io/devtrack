"use client";

import NotificationBell from "@/components/NotificationBell";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import AccountToggle from "@/components/AccountToggle";
import SignOutButton from "@/components/SignOutButton";
import ThemeToggle from "@/components/ThemeToggle";
import UserAvatar from "@/components/UserAvatar";
import KeyboardShortcuts from "@/components/KeyboardShortcuts";

export default function DashboardHeader() {
  const { data: session } = useSession();
  const [isPublic, setIsPublic] = useState<boolean | null>(null);

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

  return (
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
      </div>

      {/* Bottom Toggle */}
      <div className="mt-5">
        <AccountToggle />
      </div>
    </header>
  );
}
