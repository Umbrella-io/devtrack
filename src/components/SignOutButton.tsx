"use client"

import { signOut } from "next-auth/react"

export default function DashboardPage() {
    return (
        <button 
            onClick={() => signOut({ callbackUrl: "/" })}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded ">
            Sign-out
        </button>
    );
}
