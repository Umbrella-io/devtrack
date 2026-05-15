import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-4 text-center">
      <div className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm">
        <div className="mb-6 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--accent-soft)]">
            <span className="text-4xl" role="img" aria-label="Not Found">
              🕳️
            </span>
          </div>
        </div>
        <h1 className="mb-2 text-4xl font-bold text-[var(--card-foreground)]">404</h1>
        <h2 className="mb-4 text-xl font-semibold text-[var(--card-foreground)]">
          Oops! Page not found
        </h2>
        <p className="mb-8 text-sm text-[var(--muted-foreground)]">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex w-full items-center justify-center rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-[var(--accent-foreground)] transition-opacity hover:opacity-90"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
