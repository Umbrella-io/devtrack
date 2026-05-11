"use client"

import SignOutButton from "@/components/SignOutButton";


export default function DashboardHeader() {
    return (
        <header className="flex items-center justify-between p-4 mb-8">
            <div>
                <h1 className="text-3xl font-bold text-white">Dashboard</h1>
                <p className="text-slate-400 mt-1">Your coding activity at a glance</p>
            </div>

            <SignOutButton />

        </header>
    );
}