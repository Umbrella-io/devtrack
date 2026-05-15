"use client";

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
    const [copied, setCopied] = useState(false);
    const [copyError, setCopyError] = useState(false);

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

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);

            setCopied(true);

            setTimeout(() => {
                setCopied(false);
            }, 2000);

        } catch {
            setCopyError(true);

            setTimeout(() => {
                setCopyError(false);
            }, 2000);
        }
    };

    return (
        <header className="mb-8 border-b border-[var(--border)] p-4 pb-6">
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

                    <UserAvatar />

                    <button
                        type="button"
                        onClick={handleCopy}
                        aria-label="Copy dashboard link"
                        className="px-3 py-2 rounded-md border border-[var(--border)]"
                    >
                        {copied ? "✓ Copied!" : copyError ? "Failed" : "📋"}
                    </button>

                    <ThemeToggle />
                    <SignOutButton />
                </div>
            </div>

            <AccountToggle />
        </header>
    );
}