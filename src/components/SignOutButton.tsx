"use client"

import { signOut } from "next-auth/react"

export default function SignOutButton() {
    return (
        <button 
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="rounded-full border border-[var(--border)] bg-[var(--card)] px-4 py-2 font-semibold text-[var(--card-foreground)] transition-colors hover:bg-[var(--control)]">
            Sign-out
        </button>
    );
}
