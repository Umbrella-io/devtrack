"use client";

import { signIn } from "next-auth/react";
import { Suspense, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const A = "#818cf8";
const ERR = "#f87171";
const MONO = "var(--font-jetbrains, ui-monospace, monospace)";
const DISP = "var(--font-syne, system-ui, sans-serif)";

/** Maps NextAuth error codes → user-facing messages. */
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  github:
    "GitHub sign-in failed. This is usually caused by incorrect OAuth credentials or a mismatched callback URL. Check your GitHub OAuth App settings and try again.",
  OAuthCallback:
    "The OAuth callback could not be completed. Please try signing in again.",
  OAuthSignin:
    "Could not start the GitHub sign-in flow. Please try again.",
  Configuration:
    "There is a server configuration error. Please contact the site administrator.",
  AccessDenied:
    "Access was denied. You may have cancelled the GitHub authorization.",
  Verification:
    "The sign-in link has expired or has already been used.",
  Default:
    "An unexpected authentication error occurred. Please try again.",
};

function getErrorMessage(error: string): string {
  return AUTH_ERROR_MESSAGES[error] ?? AUTH_ERROR_MESSAGES.Default;
}

function AuthErrorBanner({ error }: { error: string }) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        width: "100%",
        marginBottom: 24,
        padding: "12px 16px",
        borderRadius: 8,
        background: "rgba(248,113,113,0.08)",
        border: `1px solid rgba(248,113,113,0.25)`,
        textAlign: "left",
      }}
    >
      <p
        style={{
          fontFamily: MONO,
          fontSize: 12,
          fontWeight: 700,
          color: ERR,
          margin: "0 0 4px",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        ⚠ Sign-in failed
      </p>
      <p
        style={{
          fontFamily: MONO,
          fontSize: 12,
          color: "#e87a7a",
          margin: 0,
          lineHeight: 1.65,
        }}
      >
        {getErrorMessage(error)}
      </p>
    </div>
  );
}

function MouseSpotlight() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current) {
        ref.current.style.transform = `translate3d(calc(${e.clientX}px - 50%), calc(${e.clientY}px - 50%), 0)`;
      }
    };
    window.addEventListener("mousemove", fn, { passive: true });
    return () => window.removeEventListener("mousemove", fn);
  }, []);
  return (
    <div
      ref={ref}
      aria-hidden
      style={{
        position: "fixed", pointerEvents: "none", zIndex: 0,
        left: 0, top: 0,
        width: 600, height: 600,
        background:
          "radial-gradient(circle, rgba(129,140,248,0.06) 0%, transparent 70%)",
        transform: "translate3d(-50%, -50%, 0)",
        willChange: "transform",
      }}
    />
  );
}

/**
 * Inner component that reads search params — must live inside a Suspense
 * boundary because useSearchParams() opts the subtree out of static rendering.
 */
function SignInContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  // Clear the ?error= param from the URL immediately after reading it so
  // that refreshing the page or navigating back doesn't show a stale error
  // from a previous sign-in attempt.
  useEffect(() => {
    if (error && typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("error");
      window.history.replaceState({}, "", url.toString());
    }
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 text-center shadow-[var(--shadow-medium)]">
        <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-[var(--accent)]/20 blur-2xl" />

      <div
        style={{
          width: "100%",
          textAlign: "center",
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >

         {/* BACK TO HOME */}
      <div
        style={{
    width: "100%",
    display: "flex",
    justifyContent: "flex-start",
    alignItems:"center",
    marginBottom: 20,
  }}
      >
        <Link
          href="/"
          style={{
            fontFamily: MONO,
            color: "var(--muted-foreground)",
            textDecoration: "none",
            fontSize: 12,
          }}
          className="hover:text-[var(--foreground)] transition-colors"
        >
           ← Back to home

        </Link>
      </div>


        
        <div style={{ marginBottom: 36 }}>
          <span
            style={{
              fontFamily: MONO,
              fontWeight: 700,
              fontSize: 13,
              color: "var(--foreground)",
              letterSpacing: "-0.02em",
            }}
          >

            <span style={{ color: A }}>▲</span> DEVTRACK
          </span>
        </div>

        <h1
          style={{
            fontFamily: DISP,
            fontWeight: 800,
            fontSize: "clamp(34px,6vw,35px)",
            letterSpacing: "-0.04em",
            lineHeight: 1.25,
            color: "var(--foreground)",
            margin: "0 0 16px",
          }}
        >

          WELCOME<br />
          <span style={{ color: A }}>BACK.</span>
        </h1>

        <p
          style={{
            fontSize: 14,
            color: "var(--muted-foreground)",
            lineHeight: 1.65,
            margin: "0 0 36px",
            fontFamily: MONO,
          }}
        >

          Track streaks, PR velocity &amp; coding growth.
        </p>

        {error && <AuthErrorBanner error={error} />}

        <button
          onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
          className="primary-button relative w-full inline-flex items-center justify-center gap-3 rounded-xl py-3 font-semibold text-[15px]"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
          Sign in with GitHub
        </button>

        <div
          style={{
            fontFamily: MONO,
            fontSize: 11,
            color: "var(--muted-foreground)",
            letterSpacing: "0.06em",
            lineHeight: 1.8,
            marginTop: 24,
          }}
        >

          MIT License · Self-hostable · Free forever
        </div>
      </div>
      </div>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInContent />
    </Suspense>
  );
}
