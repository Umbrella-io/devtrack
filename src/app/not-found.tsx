import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 text-center">
      <div className="space-y-6 max-w-md">
        {/* DevTrack Branding / Logo Placeholder */}
        <div className="flex items-center justify-center space-x-2">
          <svg
            className="h-10 w-10 text-[var(--primary)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
            />
          </svg>
          <span className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
            DevTrack
          </span>
        </div>

        {/* Error Message */}
        <div className="space-y-2">
          <h1 className="text-6xl font-extrabold tracking-tight text-[var(--primary)]">
            404
          </h1>
          <h2 className="text-2xl font-bold text-[var(--foreground)]">
            Page not found
          </h2>
          <p className="text-[var(--muted-foreground)]">
            Oops! The page you are looking for doesn't exist or has been moved.
          </p>
        </div>

        {/* Navigation Action */}
        <div className="pt-4">
  <Link
    href="/"
    className="inline-flex items-center justify-center rounded-md bg-[var(--primary)] px-5 py-2.5 text-sm font-medium text-[var(--primary-foreground)] shadow hover:opacity-90 transition-opacity"
  >
    Go to Dashboard
  </Link>
</div>
      </div>
    </div>
  );
}