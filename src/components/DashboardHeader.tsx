"use client"

import SignOutButton from "@/components/SignOutButton";
import UserAvatar from "@/components/UserAvatar";


export default function DashboardHeader() {
    return (
        <header className="flex flex-wrap items-center justify-between p-4 mb-8 gap-3">
            <div>
                <h1 className="text-2xl md:text-2xl md:text-3xl font-bold text-white">Dashboard</h1>
                <p className="text-slate-400 mt-1">Your coding activity at a glance</p>
            </div>

            <div className="flex items-center gap-3">
                <UserAvatar />
                <SignOutButton />
            </div>

        </header>
    );
}
