"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

interface Props {
  username: string;
}

export default function BackToDashboard({ username }: Props) {
  const { data: session } = useSession();

const currentUser = session?.githubLogin;
  const isOwner = currentUser === username;

  if (!isOwner) return null;

  return (
    <Link
      href="/dashboard"
      className="inline-block mb-4 text-[var(--muted-foreground)] hover:text-[var(--card-foreground)] transition-colors"
    >
      ← Back to dashboard
    </Link>
  );
}