import Link from "next/link";

export default function SignInPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card-muted)] backdrop-blur-md p-8 shadow-2xl text-center">

        <h1 className="text-4xl font-bold text-[var(--foreground)] mb-3">
          DevTrack
        </h1>

        <p className="text-[var(--muted-foreground)] mb-8">
          Track your developer journey, GitHub activity, and coding consistency.
        </p>

        <Link
          href="/api/auth/signin/github?callbackUrl=/dashboard"
          className="w-full inline-flex items-center justify-center gap-3 bg-[var(--background)] text-[var(--foreground)] font-semibold py-3 rounded-xl hover:opacity-90 transition-all duration-200 hover:scale-[1.02]"
        >
          Sign in with GitHub
        </Link>
      </div>
    </main>
  );
}
