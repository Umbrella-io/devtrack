"use client";

import { signIn } from "next-auth/react";
import { useEffect, useRef } from "react";
import { useTheme } from "@/components/ThemeContext";

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
        position: "fixed",
        pointerEvents: "none",
        width: "60%",
        height: "60%",
        background: "radial-gradient(circle, rgba(129,140,248,0.08) 0%, transparent 70%)",
        transform: "translate(-50%, -50%)",
        transition: "left 0.15s ease-out, top 0.15s ease-out",
        zIndex: 0,
      }}
    />
  );
}

export default function SignInPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: isDark ? "#0a0a0a" : "#fafafa",
        padding: "20px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <MouseSpotlight />
      
      <div
        style={{
          maxWidth: "440px",
          width: "100%",
          background: isDark ? "#1a1a1a" : "#ffffff",
          borderRadius: "24px",
          padding: "48px 40px",
          boxShadow: isDark 
            ? "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
            : "0 20px 40px -12px rgba(0, 0, 0, 0.1)",
          border: isDark ? "1px solid #2a2a2a" : "1px solid #eaeaea",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <h1
            style={{
              fontSize: "48px",
              fontWeight: "bold",
              fontFamily: DISP,
              marginBottom: "12px",
              color: isDark ? "#ffffff" : "#000000",
            }}
          >
            devtrack
          </h1>
          <p
            style={{
              color: isDark ? "#a0a0a0" : "#666666",
              fontFamily: MONO,
              fontSize: "14px",
              marginTop: "8px",
            }}
          >
            Sign in to continue
          </p>
        </div>

        <button
          onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            padding: "14px 24px",
            backgroundColor: isDark ? "#2a2a2a" : "#000000",
            color: "#ffffff",
            border: "none",
            borderRadius: "12px",
            fontSize: "16px",
            fontWeight: "500",
            fontFamily: MONO,
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = isDark ? "#3a3a3a" : "#1a1a1a";
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = isDark ? "#2a2a2a" : "#000000";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
          </svg>
          Sign in with GitHub
        </button>
      </div>
    </main>
  );
}