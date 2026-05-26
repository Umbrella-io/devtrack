"use client"

import { useState } from "react"
import { signOut } from "next-auth/react"

export default function SignOutButton() {
    const [signingOut, setSigningOut] = useState(false)
    const [confirming, setConfirming] = useState(false);

    const handleSignOut = async () => {
        setSigningOut(true)
        try {
            await signOut({ callbackUrl: "/" })
        } catch (error) {
            console.error("Sign out error:", error)
            setSigningOut(false)
        }
    }

    if (confirming) {
        return (
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={signingOut}
                    className="inline-flex h-10 items-center rounded-full bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-70"
                >
                    {signingOut ? "Signing out..." : "Confirm"}
                </button>

                <button
                    type="button"
                    onClick={() => setConfirming(false)}
                    disabled={signingOut}
                    className="inline-flex h-10 items-center rounded-full border px-4 text-sm font-semibold hover:bg-gray-100"
                >
                    Cancel
                </button>
            </div>
        )
    }

    return (
        <button
            type="button"
            disabled={signingOut}
            onClick={() => setConfirming(true)}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--destructive)]/50 bg-[var(--destructive)]/80 px-4 text-sm font-semibold text-[var(--accent-foreground)] transition-colors hover:bg-[var(--destructive)] disabled:cursor-not-allowed disabled:opacity-70"
        >
            {signingOut && (
                <svg
                    className="h-4 w-4 animate-spin text-[var(--accent-foreground)]"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                >
                    <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                    ></circle>

                    <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                </svg>
            )}

            Sign out
        </button>
    )
}

