"use client"

import { useState } from "react"
import { signOut } from "next-auth/react"

export default function SignOutButton() {
    const [signingOut, setSigningOut] = useState(false)

    const handleSignOut = async () => {
        setSigningOut(true)
        try {
            await signOut({ callbackUrl: "/" })
        } catch (error) {
            console.error("Sign out error:", error)
            setSigningOut(false)
        }
    }

    return (
        <button 
            type="button"
            disabled={signingOut}
            onClick={handleSignOut}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-[#ef4444] bg-[#ef4444] px-4 text-sm font-semibold text-[var(--destructive-foreground)] transition-all hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#ef4444] focus:ring-offset-2 focus:ring-offset-[var(--background)] disabled:cursor-not-allowed disabled:opacity-70">
            {signingOut && (
                <svg className="h-4 w-4 animate-spin text-[var(--destructive-foreground)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            )}
            {signingOut ? "Signing out..." : "Sign out"}
        </button>
    );
}

