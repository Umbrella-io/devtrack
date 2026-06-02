"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { WrappedStats } from "@/lib/wrapped";

const SLIDE_THEMES = [
  "from-cyan-500/20 via-slate-900 to-emerald-500/20",
  "from-amber-400/20 via-slate-900 to-cyan-500/20",
  "from-emerald-400/20 via-slate-900 to-rose-500/20",
  "from-sky-400/20 via-slate-900 to-lime-400/20",
  "from-fuchsia-400/20 via-slate-900 to-amber-300/20",
  "from-teal-400/20 via-slate-900 to-indigo-400/20",
  "from-orange-300/20 via-slate-900 to-cyan-300/20",
];

const formatter = new Intl.NumberFormat("en-US");

function formatNumber(value: number) {
  return formatter.format(value);
}

function buildYearOptions() {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let year = currentYear; year >= Math.max(2008, currentYear - 8); year -= 1) {
    years.push(year);
  }
  return years;
}

function getShareText(stats: WrappedStats) {
  const persona = stats.personality
    ? `I'm a ${stats.personality.icon} ${stats.personality.name}! `
    : "";

  return `My ${stats.year} Year in Code: ${persona}${formatNumber(
    stats.totalCommits
  )} commits, ${stats.longestStreak}-day streak, and ${
    stats.topLanguages[0]?.name ?? "code"
  } on top.`;
}

function getOgImageUrl(stats: WrappedStats) {
  const params = new URLSearchParams({
    username: stats.username,
    year: String(stats.year),
    commits: String(stats.totalCommits),
    streak: String(stats.longestStreak),
    language: stats.topLanguages[0]?.name ?? "Code",
    repo: stats.mostContributedRepo.name,
  });

  return `/api/wrapped/og?${params.toString()}`;
}

export default function WrappedExperience() {
  const years = useMemo(buildYearOptions, []);

  const [selectedYear, setSelectedYear] = useState<number>(
    years[0] ?? new Date().getFullYear()
  );

  const [stats, setStats] = useState<WrappedStats | null>(null);
  const [slide, setSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedYear = Number(params.get("year"));

    if (!Number.isNaN(requestedYear) && years.includes(requestedYear)) {
      setSelectedYear(requestedYear);
    }

    setOrigin(window.location.origin);
  }, [years]);

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setError(null);
    setSlide(0);

    fetch(`/api/wrapped?year=${selectedYear}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load wrapped data");
        return res.json();
      })
      .then((data: WrappedStats) => setStats(data))
      .catch((err) => {
        if (err.name !== "AbortError") {
          setError("We could not build your Year in Code right now.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [selectedYear, reloadKey]);

  /* ✅ FIX: slides MUST be defined BEFORE useEffect */
  const slides = useMemo(() => {
    if (!stats) return [];

    const languages =
      stats.topLanguages.length > 0
        ? stats.topLanguages
            .map((l) => `${l.name} ${l.percentage}%`)
            .join(" / ")
        : "No language data yet";

    return [
      {
        eyebrow: `${stats.year} recap`,
        title: `${formatNumber(stats.totalCommits)} commits`,
        body: `${stats.activeDays} active coding days captured by DevTrack.`,
        metric: "Total commits",
      },
      {
        eyebrow: "Consistency",
        title: `${stats.longestStreak} day streak`,
        body: "Your longest run of back-to-back coding days this year.",
        metric: "Longest streak",
      },
      {
        eyebrow: "Best month",
        title: stats.mostProductiveMonth.name,
        body: `${formatNumber(stats.mostProductiveMonth.commits)} commits landed in your busiest month.`,
        metric: "Most productive month",
      },
      {
        eyebrow: "Languages",
        title: stats.topLanguages[0]?.name ?? "No clear leader",
        body: languages,
        metric: "Top 3 languages",
      },
      {
        eyebrow: "Pull requests",
        title: `${formatNumber(stats.prsMerged)} merged`,
        body: "Merged pull requests authored by you during the selected year.",
        metric: "Total PRs merged",
      },
      {
        eyebrow: "Repository",
        title: stats.mostContributedRepo.name,
        body: `${formatNumber(stats.mostContributedRepo.commits)} commits from this repo.`,
        metric: "Most contributed repo",
      },
      {
        eyebrow: "Coding clock",
        title: stats.peakCodingHour.label,
        body:
          stats.peakCodingHour.hour === null
            ? "Not enough data for peak hour insight."
            : `You coded most often at ${stats.peakCodingHour.label}.`,
        metric: "Peak coding time",
      },
      {
        eyebrow: "Persona",
        title: `${stats.personality.icon} ${stats.personality.name}`,
        body: `${stats.personality.description} ${stats.personality.reason}`,
        metric: "Coding Personality",
      },
    ];
  }, [stats]);

  /* ✅ FIXED keyboard handler */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!slides.length) return;

      if (event.key === "ArrowLeft") {
        setSlide((v) => Math.max(0, v - 1));
      } else if (event.key === "ArrowRight") {
        setSlide((v) => Math.min(slides.length - 1, v + 1));
      } else if (event.key === "Home") {
        setSlide(0);
      } else if (event.key === "End") {
        setSlide(slides.length - 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [slides.length]);

  const currentSlide = slides[slide];

  const shareUrl = origin
    ? `${origin}/wrapped?year=${selectedYear}`
    : `/wrapped?year=${selectedYear}`;

  const shareText = stats
    ? getShareText(stats)
    : "My Year in Code on DevTrack";

  const twitterUrl = `https://twitter.com/intent/tweet?${new URLSearchParams({
    text: shareText,
    url: shareUrl,
  })}`;

  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?${new URLSearchParams(
    { url: shareUrl }
  )}`;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-6">

        <header className="flex justify-between border-b border-white/10 pb-5">
          <h1 className="text-4xl font-bold">Year in Code</h1>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-slate-900 border border-white/20 px-3 py-2 rounded"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </header>

        {loading ? (
          <p className="mt-10">Loading...</p>
        ) : error ? (
          <p className="mt-10 text-red-400">{error}</p>
        ) : stats && currentSlide ? (
          <section className="mt-10">
            <h2 className="text-3xl font-bold">{currentSlide.title}</h2>
            <p className="text-slate-300 mt-3">{currentSlide.body}</p>

            <div className="mt-6 flex gap-3">
              <button onClick={() => setSlide((s) => Math.max(0, s - 1))}>
                Prev
              </button>
              <button
                onClick={() =>
                  setSlide((s) => Math.min(slides.length - 1, s + 1))
                }
              >
                Next
              </button>
            </div>

            <div className="mt-6 flex gap-4">
              <a href={twitterUrl} target="_blank">Share X</a>
              <a href={linkedInUrl} target="_blank">LinkedIn</a>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-white/10 p-3 rounded">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}