"use client"

import SignOutButton from "@/components/SignOutButton";
import ThemeToggle from "@/components/ThemeToggle";
import UserAvatar from "@/components/UserAvatar";


export default function DashboardHeader() {
    return (
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] pb-6">
            <div>
                <h1 className="text-3xl font-bold text-[var(--foreground)]">Dashboard</h1>
                <p className="mt-1 text-[var(--muted-foreground)]">Your coding activity at a glance</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <UserAvatar />
                <ThemeToggle />
                <SignOutButton />
            </div>

        </header>
    );
}
