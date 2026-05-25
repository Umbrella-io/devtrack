"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function WrappedPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    fetch("/api/wrapped")
      .then(res => {
        if (!res.ok) throw new Error("Failed to load wrapped data");
        return res.json();
      })
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(e => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#09090b] text-white">
        <div className="flex flex-col items-center">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-purple-500"></div>
          <p className="mt-4 animate-pulse text-lg font-medium">Generating your Year in Code...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-[#09090b] text-white">
        <h1 className="text-2xl font-bold text-red-500">Oops!</h1>
        <p className="mt-2 text-zinc-400">{error || "Something went wrong"}</p>
        <Link href="/dashboard" className="mt-6 rounded-md bg-zinc-800 px-4 py-2 hover:bg-zinc-700">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const slides = [
    // Slide 0: Intro
    <div key="intro" className="flex h-full flex-col items-center justify-center text-center">
      <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 md:text-7xl">
        {data.year} Year in Code
      </h1>
      <p className="mt-6 text-xl text-zinc-300 md:text-2xl">
        Ready to see what you built this year, @{session?.githubLogin}?
      </p>
      <button onClick={() => setCurrentSlide(1)} className="relative z-50 mt-10 rounded-full bg-white px-8 py-3 font-semibold text-black transition-transform hover:scale-105">
        Let&apos;s Go
      </button>
    </div>,
    
    // Slide 1: Commits
    <div key="commits" className="flex h-full flex-col items-center justify-center text-center">
      <p className="text-2xl text-zinc-400">You made</p>
      <h2 className="my-4 text-7xl font-bold text-fuchsia-400">{data.totalCommits.toLocaleString()}</h2>
      <p className="text-2xl text-zinc-400">commits this year.</p>
      
      <div className="mt-12 rounded-xl bg-zinc-900/50 p-6 backdrop-blur-md">
        <p className="text-lg text-zinc-300">Your most productive month was</p>
        <p className="mt-2 text-3xl font-bold text-white">{data.productiveMonth.month}</p>
        <p className="text-sm text-zinc-500">with {data.productiveMonth.count} contributions</p>
      </div>
    </div>,

    // Slide 2: PRs & Top Repo
    <div key="prs" className="flex h-full flex-col items-center justify-center text-center">
      <p className="text-2xl text-zinc-400">You merged</p>
      <h2 className="my-4 text-7xl font-bold text-sky-400">{data.totalMergedPRs.toLocaleString()}</h2>
      <p className="text-2xl text-zinc-400">pull requests.</p>
      
      {data.topRepo !== "None" && (
        <div className="mt-12 rounded-xl bg-zinc-900/50 p-6 backdrop-blur-md">
          <p className="text-lg text-zinc-300">Your top repository was</p>
          <p className="mt-2 text-2xl font-bold text-white">{data.topRepo}</p>
        </div>
      )}
    </div>,

    // Slide 3: Languages & Streak
    <div key="lang" className="flex h-full flex-col items-center justify-center text-center">
      <div className="mb-12">
        <p className="text-2xl text-zinc-400">Your longest streak was</p>
        <h2 className="my-4 text-6xl font-bold text-yellow-400">{data.longestStreak} days</h2>
        {data.peakHour !== null && (
          <p className="text-lg text-zinc-300">You were most active around {data.peakHour}:00 UTC.</p>
        )}
      </div>

      {data.topLanguages.length > 0 && (
        <div className="rounded-xl bg-zinc-900/50 p-6 backdrop-blur-md w-full max-w-md">
          <p className="mb-4 text-lg text-zinc-300">Top Languages</p>
          <div className="space-y-3">
            {data.topLanguages.map((lang: any, i: number) => (
              <div key={lang.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-zinc-500">#{i + 1}</span>
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: lang.color }}></div>
                  <span className="text-xl font-medium text-white">{lang.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>,

    // Slide 4: Summary Card
    <div key="summary" className="flex h-full flex-col items-center justify-center text-center">
      <div id="wrapped-summary" className="relative flex flex-col items-center justify-center rounded-2xl bg-zinc-900 p-8 shadow-2xl border border-zinc-800 w-full max-w-md">
        <h2 className="text-3xl font-bold text-purple-400">{data.year} in Code</h2>
        <p className="mb-6 mt-1 text-zinc-400">@{session?.githubLogin}</p>
        
        <div className="grid w-full grid-cols-2 gap-4 text-left">
          <div className="rounded-lg bg-zinc-800 p-4">
            <p className="text-xs text-zinc-400">Commits</p>
            <p className="text-xl font-bold text-white">{data.totalCommits}</p>
          </div>
          <div className="rounded-lg bg-zinc-800 p-4">
            <p className="text-xs text-zinc-400">PRs Merged</p>
            <p className="text-xl font-bold text-white">{data.totalMergedPRs}</p>
          </div>
          <div className="rounded-lg bg-zinc-800 p-4">
            <p className="text-xs text-zinc-400">Top Language</p>
            <p className="text-xl font-bold text-white">{data.topLanguages[0]?.name || "N/A"}</p>
          </div>
          <div className="rounded-lg bg-zinc-800 p-4">
            <p className="text-xs text-zinc-400">Longest Streak</p>
            <p className="text-xl font-bold text-white">{data.longestStreak}</p>
          </div>
        </div>
      </div>

      <div className="relative z-50 mt-8 flex gap-4">
        <a 
          href={tweetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-blue-500 px-6 py-2 font-medium text-white transition hover:bg-blue-600"
        >
          Share on Twitter
        </a>
        <Link href="/dashboard" className="rounded-full bg-zinc-800 px-6 py-2 font-medium text-white transition hover:bg-zinc-700">
          Dashboard
        </Link>
      </div>
    </div>
  ];

  const handleNext = () => {
    if (currentSlide < slides.length - 1) setCurrentSlide(c => c + 1);
  };

  const handlePrev = () => {
    if (currentSlide > 0) setCurrentSlide(c => c - 1);
  };

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#050505] font-sans selection:bg-purple-500/30">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-[#050505] to-[#050505]"></div>
      
      {/* Progress bar */}
      <div className="absolute left-0 right-0 top-0 z-50 flex gap-1 p-4">
        {slides.map((_, i) => (
          <div key={i} className="h-1 flex-1 rounded-full bg-zinc-800">
            <div 
              className="h-full rounded-full bg-white transition-all duration-500 ease-out"
              style={{ width: i <= currentSlide ? '100%' : '0%' }}
            ></div>
          </div>
        ))}
      </div>

      {/* Click areas for navigation */}
      <button 
        aria-label="Previous slide"
        className="absolute inset-y-0 left-0 z-40 w-1/3 appearance-none bg-transparent outline-none cursor-pointer" 
        onClick={handlePrev} 
      />
      <button 
        aria-label="Next slide"
        className="absolute inset-y-0 right-0 z-40 w-2/3 appearance-none bg-transparent outline-none cursor-pointer" 
        onClick={handleNext} 
      />

      {/* Slides */}
      <div className="relative z-10 h-full w-full">
        {slides.map((slide, i) => (
          <div 
            key={i}
            className="absolute inset-0 transition-opacity duration-700 ease-in-out"
            style={{
              opacity: currentSlide === i ? 1 : 0,
              pointerEvents: currentSlide === i ? 'auto' : 'none',
              transform: currentSlide === i ? 'scale(1)' : currentSlide < i ? 'scale(1.05)' : 'scale(0.95)',
              transition: 'opacity 0.7s ease, transform 0.7s ease'
            }}
          >
            <div className="mx-auto flex h-full max-w-4xl flex-col items-center justify-center p-6">
              {slide}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
