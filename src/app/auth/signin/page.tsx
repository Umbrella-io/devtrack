"use client";

import { signIn } from "next-auth/react";
import { useEffect, useRef } from "react";

const A = "#818cf8";
const MONO = "var(--font-jetbrains, ui-monospace, monospace)";
const DISP = "var(--font-syne, system-ui, sans-serif)";

function MouseSpotlight() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current) {
        ref.current.style.left = e.clientX + "px";
        ref.current.style.top = e.clientY + "px";
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
        width: 600, height: 600,
        background:
          "radial-gradient(circle, rgba(129,140,248,0.06) 0%, transparent 70%)",
        transform: "translate(-50%,-50%)",
        transition: "left 0.15s ease-out, top 0.15s ease-out",
      }}
    />
  );
}

export default function SignInPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#080808",
        padding: "0 20px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <MouseSpotlight />

      {/* Subtle grid */}
      <div
        aria-hidden
        style={{
          position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
          backgroundImage:
            "linear-gradient(rgba(129,140,248,0.03) 1px, transparent 1px)," +
            "linear-gradient(90deg, rgba(129,140,248,0.03) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      {/* Card */}
      <div
        style={{
          width: "100%", maxWidth: 420,
          border: "1px solid #1a1a1a",
          borderRadius: 12,
          padding: "clamp(28px,5vw,48px) clamp(24px,5vw,40px)",
          background: "#0e0e0e",
          textAlign: "center",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Logo */}
        <div style={{ marginBottom: 36 }}>
          <span
            style={{
              fontFamily: MONO, fontWeight: 700, fontSize: 13,
              color: "#e8e8e8", letterSpacing: "-0.02em",
            }}
          >
            <span style={{ color: A }}>▲</span> DEVTRACK
          </span>
        </div>

        {/* Heading */}
        <h1
          style={{
            fontFamily: DISP, fontWeight: 800,
            fontSize: "clamp(34px,6vw,52px)",
            letterSpacing: "-0.04em", lineHeight: 0.95,
            color: "#e8e8e8", margin: "0 0 16px",
          }}
        >
          WELCOME<br />
          <span style={{ color: A }}>BACK.</span>
        </h1>

        <p
          style={{
            fontSize: 14, color: "#555",
            lineHeight: 1.65, margin: "0 0 36px",
            fontFamily: MONO,
          }}
        >
          Track streaks, PR velocity &amp; coding growth.
        </p>

        {/* GitHub button */}
        <button
          onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
          style={{
            width: "100%",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            gap: 10,
            background: A, color: "#000",
            fontFamily: MONO, fontWeight: 600, fontSize: 14,
            padding: "14px 24px", borderRadius: 6,
            border: "none", cursor: "pointer",
            transition: "background 0.2s, transform 0.1s",
            marginBottom: 20,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "#fff";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = A;
          }}
          onMouseDown={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.97)";
          }}
          onMouseUp={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
          }}
        >
          <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
          Sign in with GitHub
        </button>

        <div
          style={{
            fontFamily: MONO, fontSize: 11, color: "#333",
            letterSpacing: "0.06em", lineHeight: 1.8,
          }}
        >
          MIT License · Self-hostable · Free forever
        </div>
      </div>
    </main>
  );
}
