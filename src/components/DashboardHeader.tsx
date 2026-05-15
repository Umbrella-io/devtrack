"use client";

import { useState } from "react";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import SignOutButton from "@/components/SignOutButton";
import ThemeToggle from "@/components/ThemeToggle";
import UserAvatar from "@/components/UserAvatar";
export default function DashboardHeader() {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);

            setCopied(true);

            setTimeout(() => {
                setCopied(false);
            }, 2000);

        } catch (error) {
            console.error(error);
            alert("Copy failed");
        }
    };

    return (
        <header className="flex flex-wrap items-center justify-between p-4 mb-8 gap-3 border-b border-[var(--border)] pb-6">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold text-[var(--foreground)]">
                    Dashboard
                </h1>

                <p className="mt-1 text-[var(--muted-foreground)]">
                    Your coding activity at a glance
                </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <UserAvatar />

                <button
                    type="button"
                    onClick={handleCopy}
                    aria-label="Copy dashboard link"
                    className="px-3 py-2 rounded-md border border-[var(--border)]"
                >
                    {copied ? "Copied!" : "📋"}
                </button>

                <ThemeToggle />
                <SignOutButton />
            </div>
        </header>
    );
}
interface UserSettings {
  is_public: boolean;
}

export default function DashboardHeader() {
  const { data: session } = useSession();
  const [settings, setSettings] = useState<UserSettings | null>(null);

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

  return (
    <header className="flex flex-wrap items-center justify-between p-4 mb-8 gap-3 border-b border-[var(--border)] pb-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-[var(--foreground)]">
          Dashboard
        </h1>
        <p className="mt-1 text-[var(--muted-foreground)]">
          Your coding activity at a glance
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {settings?.is_public && session?.githubLogin && (
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
        <UserAvatar />
        <ThemeToggle />
        <SignOutButton />
      </div>
    </header>
  );
}
