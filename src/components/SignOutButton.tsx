"use client"

import { signOut } from "next-auth/react"

export default function SignOutButton() {
    return (
        <button 
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="rounded-full border border-red-600/50 bg-red-600/80 px-4 py-2 font-semibold text-white transition-colors hover:bg-red-600">
            Sign-out
        </button>
    );
}
