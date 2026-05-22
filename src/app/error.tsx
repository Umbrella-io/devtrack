"use client";

import { useEffect } from "react";

const SAFE_ERROR_MESSAGES: Record<string, string> = {
  TokenRevoked: "Your GitHub session has expired. Please sign in again.",
};

function getSafeMessage(error: Error): string {
  if (error.message in SAFE_ERROR_MESSAGES) {
    return SAFE_ERROR_MESSAGES[error.message];
  }
  if (process.env.NODE_ENV === "production") {
    return "An unexpected error occurred. Our team has been notified.";
  }
  return error.message || "Unknown error";
}

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error(error);
    }
    // reportToSentry(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-4 text-center">
      <div className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm">
        <div className="mb-6 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-10 w-10"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>
        <h1 className="mb-2 text-2xl font-bold text-[var(--card-foreground)]">
          Something went wrong
        </h1>
        <p className="mb-6 text-sm text-[var(--muted-foreground)]">
          {getSafeMessage(error)}
        </p>
        {error.digest && (
          <p className="mb-4 text-xs text-[var(--muted-foreground)]">
            Error ID: <code className="font-mono">{error.digest}</code>
          </p>
        )}
        <button
          onClick={reset}
          className="inline-flex w-full items-center justify-center rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-[var(--accent-foreground)] transition-opacity hover:opacity-90"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
