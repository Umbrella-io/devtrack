"use client";

import React from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

export default function Navbar() {
  const { data: session } = useSession();
  const username = session?.githubLogin || session?.user?.name || "demo";

  return (
    <nav className="flex items-center gap-6 p-4 border-b border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]">
      <Link href="/dashboard" className="font-medium hover:text-[var(--accent)] transition-colors">
        Dashboard
      </Link>
      <Link href="/leaderboard" className="font-medium hover:text-[var(--accent)] transition-colors">
        Leaderboard
      </Link>
      <Link href={`/u/${username}`} className="font-medium hover:text-[var(--accent)] transition-colors">
        Public Profile
      </Link>
    </nav>
  );
}
