"use client";

import NotificationBell from "@/components/NotificationBell";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import AccountToggle from "@/components/AccountToggle";
import SignOutButton from "@/components/SignOutButton";
import ThemeToggle from "@/components/ThemeToggle";
import UserAvatar from "@/components/UserAvatar";
import KeyboardShortcuts from "@/components/KeyboardShortcuts";
import { Moon, Sun } from "lucide-react"; 

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

  const displayName = session?.user?.name || session?.githubLogin || "Developer";

  return (
    <header className="mb-8 rounded-3xl border border-[var(--border)] bg-[var(--card)]/95 p-5 shadow-[var(--shadow-soft)] backdrop-blur-md transition-all duration-300 hover:shadow-[var(--shadow-medium)] md:p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">

        {/* Left Section */}
        <div>
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