"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import SignOutButton from "@/components/SignOutButton";
import ThemeToggle from "@/components/ThemeToggle";
import UserAvatar from "@/components/UserAvatar";

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Logo/Brand */}
          <Link href="/dashboard" className="text-2xl font-bold text-[var(--foreground)] hover:text-blue-400 transition">
            DevTrack
          </Link>

          {/* Navigation Links */}
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <Link
              href="/dashboard"
              className={`rounded-lg px-4 py-2 font-semibold transition-colors ${
                pathname === "/dashboard"
                  ? "bg-blue-600 text-white"
                  : "text-[var(--foreground)] hover:bg-slate-700"
              }`}
            >
              Dashboard
            </Link>
            <Link
              href="/profile"
              className={`rounded-lg px-4 py-2 font-semibold transition-colors ${
                pathname === "/profile"
                  ? "bg-blue-600 text-white"
                  : "text-[var(--foreground)] hover:bg-slate-700"
              }`}
            >
              Profile
            </Link>

            {/* Right side items */}
            <div className="flex items-center gap-2 md:gap-3 ml-2 md:ml-4 pl-2 md:pl-4 border-l border-[var(--border)]">
              <UserAvatar />
              <ThemeToggle />
              <SignOutButton />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
