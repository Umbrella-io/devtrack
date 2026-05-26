import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[75vh] flex-col items-center justify-center px-4 text-center">
      <div className="relative flex flex-col items-center justify-center">
        {/* Branded 404 code */}
        <h1 className="text-9xl font-extrabold tracking-widest text-[var(--accent)] drop-shadow-md selection:bg-transparent">
          404
        </h1>
        <div className="absolute rotate-12 rounded bg-[var(--accent)] px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-[var(--accent-foreground)] shadow-md inline-block selection:bg-transparent">
          Page Not Found
        </div>
      </div>

      <div className="mt-8 max-w-md">
        <h2 className="text-2xl font-bold md:text-3xl text-[var(--card-foreground)]">
          Lost in space?
        </h2>
        <p className="mt-4 text-sm text-[var(--muted-foreground)] leading-relaxed">
          The page you are looking for might have been removed, had its name changed, or is temporarily unavailable. Let&apos;s get you back on track!
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="rounded-lg bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-[var(--accent-foreground)] shadow-lg transition-all hover:opacity-95 active:scale-[0.98]"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/"
            className="rounded-lg border border-[var(--border)] bg-[var(--control)] px-6 py-3 text-sm font-semibold text-[var(--card-foreground)] transition-all hover:bg-[var(--accent)]/10 active:scale-[0.98]"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
