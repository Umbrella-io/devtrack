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

  return (
    <header className="mb-8 rounded-3xl border border-[var(--border)] bg-[var(--card)]/95 p-5 shadow-[var(--shadow-soft)] backdrop-blur-md transition-all duration-300 hover:shadow-[var(--shadow-medium)] md:p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">

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
          </p>
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