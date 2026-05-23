"use client";

import Link from "next/link";

interface Props {
  username: string;
}

export default function BackToDashboard({ username }: Props) {
  return (
    <Link
      href={`/dashboard/${username}`}
      className="mb-4 inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
    >
      ← Back to Dashboard
    </Link>
  );
}




