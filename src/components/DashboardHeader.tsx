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
    <header className="mb-8 rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-lg backdrop-blur-md p-5 md:p-6 transition-all duration-300 hover:shadow-2xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">

        {/* Left Section */}
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-[var(--foreground)] to-[var(--accent)] bg-clip-text text-transparent">
            Dashboard
          </h1>

          <p className="mt-2 text-sm md:text-base text-[var(--muted-foreground)]">
            Your coding activity at a glance 🚀
          </p>
        </div>

        {/* Right Section */}
        <div className="flex flex-wrap items-center gap-3">

          {isPublic === true && session?.githubLogin && (
            <a
              href={`/u/${session.githubLogin}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--accent-foreground)] text-sm font-semibold shadow-md hover:scale-105 hover:shadow-xl transition-all duration-300"
              title="View your public profile"
            >
              Share Profile
            </a>
          )}

          <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card-muted)] px-3 py-2 shadow-sm">

              <KeyboardShortcuts />
            

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
