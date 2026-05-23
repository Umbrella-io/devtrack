"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount } from "@/components/AccountContext";

interface PersonaData {
  persona: {
    key:
      | "night_owl"
      | "early_bird"
      | "refactorer"
      | "marathoner"
      | "speed_runner"
      | "balanced_builder";
    title: string;
    emoji: string;
    description: string;
    gradient: string;
  };
  insights: Array<{
    title: string;
    description: string;
  }>;
}

const personaStyles: Record<PersonaData["persona"]["key"], {
  badge: string;
  icon: string;
  orb: string;
  aura: string;
  border: string;
  shadow: string;
  shine: string;
  accent: string;
  sparkle: string;
}> = {
  night_owl: {
    badge: "border-indigo-300/15 bg-slate-950/45 text-indigo-100",
    icon: "border-indigo-300/15 bg-slate-950/40 text-indigo-100",
    orb: "from-indigo-500/12 via-slate-900/10 to-transparent",
    aura: "bg-gradient-to-br from-indigo-500/15 via-sky-500/8 to-transparent",
    border: "motion-safe:hover:border-indigo-300/25",
    shadow: "motion-safe:hover:shadow-[0_18px_42px_rgba(79,70,229,0.14)]",
    shine: "via-indigo-200/12",
    accent: "motion-safe:group-hover:shadow-[0_0_18px_rgba(96,165,250,0.22)]",
    sparkle: "shadow-indigo-500/10",
  },
  early_bird: {
    badge: "border-amber-300/15 bg-slate-950/45 text-amber-100",
    icon: "border-amber-300/15 bg-slate-950/40 text-amber-100",
    orb: "from-amber-400/12 via-slate-900/10 to-transparent",
    aura: "bg-gradient-to-br from-amber-300/16 via-yellow-400/8 to-transparent",
    border: "motion-safe:hover:border-amber-200/30",
    shadow: "motion-safe:hover:shadow-[0_18px_42px_rgba(245,158,11,0.14)]",
    shine: "via-amber-100/14",
    accent: "motion-safe:group-hover:shadow-[0_0_18px_rgba(251,191,36,0.22)]",
    sparkle: "shadow-amber-500/10",
  },
  refactorer: {
    badge: "border-emerald-300/15 bg-slate-950/45 text-emerald-100",
    icon: "border-emerald-300/15 bg-slate-950/40 text-emerald-100",
    orb: "from-emerald-400/12 via-slate-900/10 to-transparent",
    aura: "bg-gradient-to-br from-emerald-400/15 via-cyan-400/8 to-transparent",
    border: "motion-safe:hover:border-emerald-200/28",
    shadow: "motion-safe:hover:shadow-[0_18px_42px_rgba(16,185,129,0.14)]",
    shine: "via-emerald-100/12",
    accent: "motion-safe:group-hover:shadow-[0_0_18px_rgba(52,211,153,0.22)]",
    sparkle: "shadow-emerald-500/10",
  },
  marathoner: {
    badge: "border-fuchsia-300/15 bg-slate-950/45 text-fuchsia-100",
    icon: "border-fuchsia-300/15 bg-slate-950/40 text-fuchsia-100",
    orb: "from-fuchsia-500/12 via-slate-900/10 to-transparent",
    aura: "bg-gradient-to-br from-fuchsia-400/15 via-pink-400/8 to-transparent",
    border: "motion-safe:hover:border-fuchsia-200/28",
    shadow: "motion-safe:hover:shadow-[0_18px_42px_rgba(217,70,239,0.14)]",
    shine: "via-fuchsia-100/12",
    accent: "motion-safe:group-hover:shadow-[0_0_18px_rgba(236,72,153,0.22)]",
    sparkle: "shadow-fuchsia-500/10",
  },
  speed_runner: {
    badge: "border-sky-300/15 bg-slate-950/45 text-sky-100",
    icon: "border-sky-300/15 bg-slate-950/40 text-sky-100",
    orb: "from-sky-400/12 via-slate-900/10 to-transparent",
    aura: "bg-gradient-to-br from-orange-400/14 via-red-400/8 to-transparent",
    border: "motion-safe:hover:border-sky-200/28",
    shadow: "motion-safe:hover:shadow-[0_18px_42px_rgba(249,115,22,0.14)]",
    shine: "via-orange-100/12",
    accent: "motion-safe:group-hover:shadow-[0_0_18px_rgba(251,146,60,0.22)]",
    sparkle: "shadow-sky-500/10",
  },
  balanced_builder: {
    badge: "border-slate-300/15 bg-slate-950/45 text-slate-100",
    icon: "border-slate-300/15 bg-slate-950/40 text-slate-100",
    orb: "from-slate-500/12 via-slate-900/10 to-transparent",
    aura: "bg-gradient-to-br from-slate-400/12 via-slate-200/6 to-transparent",
    border: "motion-safe:hover:border-slate-200/25",
    shadow: "motion-safe:hover:shadow-[0_18px_42px_rgba(148,163,184,0.12)]",
    shine: "via-slate-100/10",
    accent: "motion-safe:group-hover:shadow-[0_0_18px_rgba(148,163,184,0.18)]",
    sparkle: "shadow-slate-500/10",
  },
};

export default function DeveloperPersona() {
  const { selectedAccount } = useAccount();
  const [data, setData] = useState<PersonaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPersona = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);

      try {
        const url =
          selectedAccount !== null
            ? `/api/metrics/insights?accountId=${encodeURIComponent(selectedAccount)}`
            : "/api/metrics/insights";

        const response = await fetch(url, signal ? { signal } : undefined);

        if (!response.ok) {
          throw new Error("API error");
        }

        const result = (await response.json()) as PersonaData;
        setData(result);
      } catch (fetchError) {
        if ((fetchError as Error).name === "AbortError") {
          return;
        }

        setError(
          "We couldn't load your developer persona right now. Please try again in a moment."
        );
      } finally {
        setLoading(false);
      }
    },
    [selectedAccount]
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadPersona(controller.signal);

    return () => controller.abort();
  }, [loadPersona]);

  const theme = useMemo(
    () => personaStyles[data?.persona.key ?? "balanced_builder"],
    [data?.persona.key]
  );

  return (
    <section className={`group relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm transition-[transform,box-shadow,border-color,background-color,filter] duration-300 ease-out motion-safe:transform-gpu motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-2xl ${theme.border} ${theme.shadow}`}>
      <div
        aria-hidden="true"
        className={`absolute inset-0 bg-gradient-to-br opacity-95 transition-opacity duration-300 ease-out group-hover:opacity-100 ${data?.persona.gradient ?? "from-slate-500/8 via-slate-900/12 to-slate-950"}`}
      />
      <div
        aria-hidden="true"
        className={`absolute -right-24 top-0 h-56 w-56 rounded-full bg-gradient-to-br opacity-75 blur-3xl transition-[opacity,transform,filter] duration-300 ease-out group-hover:opacity-100 group-hover:scale-105 group-hover:blur-[40px] ${theme.orb}`}
      />
      <div
        aria-hidden="true"
        className={`absolute inset-0 opacity-70 transition-opacity duration-300 ease-out group-hover:opacity-90 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.05),transparent_28%)]`}
      />
      <div
        aria-hidden="true"
        className={`absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.08),transparent_34%)] opacity-40 mix-blend-screen transition-opacity duration-300 ease-out group-hover:opacity-70 ${theme.aura}`}
      />
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 -left-1/3 w-1/2 skew-x-[-18deg] bg-gradient-to-r from-transparent ${theme.shine} to-transparent opacity-0 transition-[transform,opacity] duration-700 ease-out group-hover:translate-x-[260%] group-hover:opacity-100`}
      />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
              Persona & Insights
            </p>
            <h2 className="mt-1 text-lg font-semibold text-[var(--card-foreground)]">
              Developer Persona & Smart Insights
            </h2>
          </div>

          <span
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium backdrop-blur transition-[transform,box-shadow,border-color,background-color,filter] duration-300 ease-out motion-safe:transform-gpu motion-safe:hover:-translate-y-0.5 motion-safe:hover:scale-[1.02] motion-safe:hover:shadow-lg ${theme.badge} ${theme.accent}`}
          >
            Adaptive
          </span>
        </div>

        {loading ? (
          <div
            role="status"
            aria-live="polite"
            aria-busy="true"
            className="mt-5 space-y-4"
          >
            <span className="sr-only">Loading developer persona</span>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)]/60 p-5 backdrop-blur-sm">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 animate-pulse rounded-2xl bg-[var(--card-muted)]" />
                <div className="flex-1 space-y-3">
                  <div className="h-3 w-28 rounded-full bg-[var(--card-muted)] animate-pulse" />
                  <div className="h-7 w-40 rounded-lg bg-[var(--card-muted)] animate-pulse" />
                  <div className="h-4 w-full rounded-lg bg-[var(--card-muted)] animate-pulse" />
                </div>
              </div>
            </div>
            <div className="grid gap-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  aria-hidden="true"
                  className="h-20 rounded-xl border border-[var(--border)] bg-[var(--card-muted)] animate-pulse"
                />
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => void loadPersona()}
              className="mt-3 rounded-md border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-200 transition-colors duration-200 ease-out hover:bg-red-500/10"
            >
              Try again
            </button>
          </div>
        ) : data ? (
          <div className="mt-5 space-y-5">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)]/70 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-md transition-[transform,box-shadow,border-color,background-color,filter] duration-300 ease-out motion-safe:transform-gpu motion-safe:hover:-translate-y-0.5 motion-safe:hover:border-[color:color-mix(in_srgb,var(--border)_68%,white_32%)] motion-safe:hover:shadow-[0_16px_36px_rgba(2,6,23,0.24)] motion-safe:hover:backdrop-blur-lg">
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border text-3xl shadow-lg transition-[transform,box-shadow,border-color,background-color,filter] duration-300 ease-out motion-safe:transform-gpu motion-safe:hover:-translate-y-0.5 motion-safe:hover:scale-[1.02] motion-safe:hover:shadow-xl ${theme.icon} ${theme.sparkle} ${theme.accent}`}
                >
                  {data.persona.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                    Primary Persona
                  </p>
                  <h3 className="mt-1 text-2xl font-semibold text-[var(--card-foreground)]">
                    {data.persona.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                    {data.persona.description}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                  Smart Insights
                </h3>
                <span className="text-xs text-[var(--muted-foreground)]">
                  Based on recent commits, PRs, and streak patterns
                </span>
              </div>

              {data.insights.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--background)]/50 p-4 text-sm text-[var(--muted-foreground)]">
                  Keep committing to unlock more personalized insights.
                </div>
              ) : (
                <div className="grid gap-3">
                  {data.insights.map((insight, index) => (
                    <article
                      key={`${insight.title}-${index}`}
                      className={`group rounded-xl border border-[var(--border)] bg-[var(--control)]/70 p-4 transition-[transform,box-shadow,border-color,background-color,filter] duration-200 ease-out motion-safe:transform-gpu motion-safe:hover:-translate-y-0.5 motion-safe:hover:bg-[color-mix(in_srgb,var(--control)_86%,white_14%)] motion-safe:hover:shadow-md ${theme.border}`}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--accent)] shadow-[0_0_0_0_rgba(0,0,0,0)] transition-[transform,box-shadow,background-color,opacity] duration-200 ease-out motion-safe:transform-gpu motion-safe:group-hover:scale-110 motion-safe:group-hover:opacity-90 ${theme.accent}`} />
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold text-[var(--card-foreground)] transition-colors duration-200 ease-out group-hover:text-white">
                            {insight.title}
                          </h4>
                          <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)] transition-colors duration-200 ease-out group-hover:text-[var(--foreground)]/90">
                            {insight.description}
                          </p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}