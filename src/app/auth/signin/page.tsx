"use client";

import { signIn } from "next-auth/react";

export default function SignInPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card-muted)] p-8 shadow-lg">
        <h1 className="text-2xl sm:text-4xl font-bold text-[var(--foreground)] mb-3">
          DevTrack
        </h1>

        <p className="text-sm sm:text-base text-[var(--muted-foreground)] mb-6">
          Sign in with GitHub to continue.
        </p>

        <button
          onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
          className="w-full rounded-xl bg-[var(--foreground)] px-4 py-3 text-[var(--background)] font-semibold hover:opacity-90 transition"
        >
          Login with GitHub
        </button>
      </div>
    </main>
  );
}