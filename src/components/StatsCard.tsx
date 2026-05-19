"use client";

import { useRef, useState } from "react";
import { toPng } from "html-to-image";

interface StatsCardProps {
  username: string;
  avatarUrl: string;
  currentStreak: number;
  longestStreak: number;
  totalCommits: number;
  topRepo: string;
}

/** Renders a 1200×630 OG-style stats card and triggers a PNG download. */
export default function StatsCard({
  username,
  avatarUrl,
  currentStreak,
  longestStreak,
  totalCommits,
  topRepo,
}: StatsCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);

  async function handleDownload() {
    if (!cardRef.current) return;
    setGenerating(true);

    try {
      const dataUrl = await toPng(cardRef.current, {
        width: 1200,
        height: 630,
        pixelRatio: 2,
        style: {
          // Make sure the off-screen card renders with correct dimensions
          transform: "none",
        },
      });

      const link = document.createElement("a");
      link.download = `devtrack-${username}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("[StatsCard] Failed to generate image:", err);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <>
      {/* ── Download button ───────────────────────────────────────── */}
      <button
        onClick={handleDownload}
        disabled={generating}
        id="download-stats-card-btn"
        aria-label="Download stats card as PNG"
        className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-medium text-[var(--card-foreground)] shadow-sm transition hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {generating ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Generating…
          </>
        ) : (
          <>
            {/* Download icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4"
              aria-hidden="true"
            >
              <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
              <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
            </svg>
            Download stats card
          </>
        )}
      </button>

      {/* ── Off-screen card (1200×630) ────────────────────────────── */}
      {/*
        Positioned absolutely off-screen so it doesn't affect page layout
        but is still rendered in the DOM for html-to-image to capture.
      */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "-9999px",
          top: 0,
          width: 1200,
          height: 630,
          overflow: "hidden",
        }}
      >
        <div
          ref={cardRef}
          style={{
            width: 1200,
            height: 630,
            background: "linear-gradient(135deg, #0f1117 0%, #1a1d2e 50%, #0f1117 100%)",
            fontFamily: "'Inter', 'Segoe UI', sans-serif",
            display: "flex",
            flexDirection: "column",
            padding: "56px 64px",
            boxSizing: "border-box",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Background accent glow */}
          <div
            style={{
              position: "absolute",
              top: -120,
              right: -120,
              width: 480,
              height: 480,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: -80,
              left: -60,
              width: 320,
              height: 320,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(99,102,241,0.10) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />

          {/* ── Header: avatar + username + branding ── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 48,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              {/* Avatar */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatarUrl}
                alt={username}
                width={80}
                height={80}
                style={{
                  borderRadius: "50%",
                  border: "3px solid rgba(99,102,241,0.6)",
                  display: "block",
                }}
              />
              <div>
                <div
                  style={{
                    fontSize: 36,
                    fontWeight: 800,
                    color: "#f1f5f9",
                    lineHeight: 1.1,
                    letterSpacing: "-0.5px",
                  }}
                >
                  @{username}
                </div>
                <div
                  style={{
                    fontSize: 16,
                    color: "#94a3b8",
                    marginTop: 4,
                  }}
                >
                  GitHub Developer Stats
                </div>
              </div>
            </div>

            {/* DevTrack branding */}
            <div
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "#6366f1",
                letterSpacing: "0.5px",
                opacity: 0.9,
              }}
            >
              devtrack.app
            </div>
          </div>

          {/* ── Stats grid ── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr 1fr",
              gap: 20,
              flex: 1,
            }}
          >
            {/* Current Streak */}
            <StatBox
              icon="🔥"
              label="Current Streak"
              value={String(currentStreak)}
              unit="days"
              accent
            />
            {/* Longest Streak */}
            <StatBox
              icon="🏆"
              label="Longest Streak"
              value={String(longestStreak)}
              unit="days"
            />
            {/* Total Commits */}
            <StatBox
              icon="⚡"
              label="Total Commits"
              value={totalCommits >= 1000 ? `${(totalCommits / 1000).toFixed(1)}k` : String(totalCommits)}
              unit="commits"
            />
            {/* Top Repo */}
            <StatBox
              icon="📦"
              label="Top Repository"
              value={topRepo.split("/")[1] ?? topRepo}
              unit=""
              small
            />
          </div>

          {/* ── Footer ── */}
          <div
            style={{
              marginTop: 32,
              paddingTop: 20,
              borderTop: "1px solid rgba(255,255,255,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ fontSize: 13, color: "#475569" }}>
              Generated by DevTrack · devtrack.app/u/{username}
            </div>
            <div
              style={{
                fontSize: 12,
                color: "#334155",
                background: "rgba(99,102,241,0.12)",
                border: "1px solid rgba(99,102,241,0.2)",
                borderRadius: 6,
                padding: "4px 12px",
              }}
            >
              #OpenSource
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/** Individual stat box inside the card */
function StatBox({
  icon,
  label,
  value,
  unit,
  accent = false,
  small = false,
}: {
  icon: string;
  label: string;
  value: string;
  unit: string;
  accent?: boolean;
  small?: boolean;
}) {
  return (
    <div
      style={{
        background: accent
          ? "linear-gradient(135deg, rgba(99,102,241,0.25) 0%, rgba(99,102,241,0.10) 100%)"
          : "rgba(255,255,255,0.04)",
        border: accent
          ? "1px solid rgba(99,102,241,0.45)"
          : "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16,
        padding: "24px 20px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        backdropFilter: "blur(8px)",
      }}
    >
      <div style={{ fontSize: 28, lineHeight: 1 }}>{icon}</div>
      <div>
        <div
          style={{
            fontSize: small ? 22 : 40,
            fontWeight: 800,
            color: accent ? "#a5b4fc" : "#f1f5f9",
            lineHeight: 1.1,
            marginTop: 12,
            wordBreak: "break-word",
          }}
        >
          {value || "—"}
        </div>
        {unit && (
          <div
            style={{
              fontSize: 13,
              color: "#64748b",
              marginTop: 4,
            }}
          >
            {unit}
          </div>
        )}
        <div
          style={{
            fontSize: 13,
            color: "#94a3b8",
            marginTop: 8,
            fontWeight: 500,
          }}
        >
          {label}
        </div>
      </div>
    </div>
  );
}
