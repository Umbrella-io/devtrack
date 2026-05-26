"use client";

import { signIn } from "next-auth/react";

export default function SignInPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 text-center shadow-[var(--shadow-medium)]">
        <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-[var(--accent)]/20 blur-2xl" />

        <h1 className="text-4xl font-bold text-[var(--foreground)] mb-3">
          DevTrack
        </h1>

        <p className="text-[var(--muted-foreground)] mb-8">
          Track your developer journey, GitHub activity, and coding consistency.
        </p>

        <button
          onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
          className="primary-button relative w-full inline-flex items-center justify-center gap-3 rounded-xl py-3 font-semibold"
        >
          Sign in with GitHub
        </button>
      </div>
    </main>
  );
}
