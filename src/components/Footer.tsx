"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const year = new Date().getFullYear();

export default function Footer() {
  const pathname = usePathname();
  const isLanding = pathname === "/";

  if (pathname === "/wrapped") return null;

  return (
    <footer className={`dark mt-auto border-t relative overflow-hidden ${isLanding ? 'bg-transparent border-slate-900/40' : 'border-[var(--border)] bg-[var(--background)]'}`}>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(129,140,248,0.05),transparent_50%)] pointer-events-none" />

      <div className="relative mx-auto w-full max-w-7xl px-4 py-8 sm:px-8 sm:py-10 lg:px-12">
        {/* Mobile: single column; tablet: 2 cols; desktop: 4 cols */}
        <div className="grid gap-8 grid-cols-2 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          {/* Brand blurb — spans full width on mobile only */}
          <div className="col-span-2 lg:col-span-1">
            <div className="inline-flex items-center rounded-full border border-[#818cf8]/20 bg-[#818cf8]/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#818cf8]">
              Open source developer dashboard
            </div>
            <h2
              className="mt-4 text-xl sm:text-2xl font-extrabold text-[#e8e8e8] tracking-tight"
              style={{ fontFamily: "var(--font-syne, system-ui, sans-serif)", letterSpacing: "-0.03em" }}
            >
              DevTrack keeps your<br />coding story in one place.
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-[#9ca3af]" style={{ fontFamily: "var(--font-jetbrains, ui-monospace, monospace)" }}>
              Track GitHub contributions, PR velocity, streaks, goals, and
              community activity with a dashboard built for contributors who
              work in public.
            </p>
          </div>

          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#e8e8e8]" style={{ fontFamily: "var(--font-jetbrains, ui-monospace, monospace)" }}>
              Product
            </h3>
            <div className="mt-4 flex flex-col gap-3 text-sm text-[#9ca3af]">
              <Link className="transition-all duration-200 hover:text-white hover:translate-x-1 w-fit py-1 min-h-[44px] flex items-center" href="/">
                Home
              </Link>
              <Link className="transition-all duration-200 hover:text-white hover:translate-x-1 w-fit py-1 min-h-[44px] flex items-center" href="/dashboard">
                Dashboard
              </Link>
              <Link className="transition-all duration-200 hover:text-white hover:translate-x-1 w-fit py-1 min-h-[44px] flex items-center" href="/leaderboard">
                Leaderboard
              </Link>
              <Link className="transition-colors hover:text-[var(--card-foreground)] py-1 min-h-[44px] flex items-center" href="/contact">
                Contact
              </Link>
            </div>
          </div>

          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#e8e8e8]" style={{ fontFamily: "var(--font-jetbrains, ui-monospace, monospace)" }}>
              Community
            </h3>
            <div className="mt-4 flex flex-col gap-3 text-sm text-[#9ca3af]">
              <a
                className="transition-all duration-200 hover:text-white hover:translate-x-1 w-fit py-1 min-h-[44px] flex items-center"
                href="https://github.com/Priyanshu-byte-coder/devtrack/discussions"
                target="_blank"
                rel="noopener noreferrer"
              >
                Discussions
              </a>
              <a
                className="transition-all duration-200 hover:text-white hover:translate-x-1 w-fit py-1 min-h-[44px] flex items-center"
                href="https://github.com/Priyanshu-byte-coder/devtrack/issues"
                target="_blank"
                rel="noopener noreferrer"
              >
                Issues
              </a>
              <a
                className="transition-all duration-200 hover:text-white hover:translate-x-1 w-fit py-1 min-h-[44px] flex items-center"
                href="https://github.com/Priyanshu-byte-coder/devtrack"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub Repository
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#e8e8e8]" style={{ fontFamily: "var(--font-jetbrains, ui-monospace, monospace)" }}>
              Contact
            </h3>
            <div className="mt-4 flex flex-col gap-3 text-sm text-[#9ca3af]">
              <a
                className="transition-all duration-200 hover:text-white hover:translate-x-1 w-fit py-1 min-h-[44px] flex items-center"
                href="https://www.linkedin.com/in/priyanshu-doshi-21a54230a/"
                target="_blank"
                rel="noreferrer"
              >
                LinkedIn
              </a>
              <a
                className="transition-all duration-200 hover:text-white hover:translate-x-1 w-fit py-1 min-h-[44px] flex items-center"
                href="https://github.com/Priyanshu-byte-coder"
                target="_blank"
                rel="noreferrer"
              >
                GitHub
              </a>
              <a
                className="transition-all duration-200 hover:text-white hover:translate-x-1 w-fit py-1 min-h-[44px] flex items-center"
                href="https://portfolio-eta-gilt-84.vercel.app/"
                target="_blank"
                rel="noreferrer"
              >
                Portfolio
              </a>
              <a
                className="transition-all duration-200 hover:text-white hover:translate-x-1 w-fit py-1 min-h-[44px] flex items-center"
                href="mailto:doshipriyanshu3@gmail.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                Email
              </a>
            </div>
          </div>
        </div>

        <div
          className="mt-8 flex flex-col gap-3 border-t border-[var(--border)] pt-5 text-[12px] text-[#9ca3af] sm:flex-row sm:items-center sm:justify-between"
          style={{ fontFamily: "var(--font-jetbrains, ui-monospace, monospace)" }}
        >
          <p>© {year} DevTrack. Built for open-source contributors.</p>
          <div className="flex flex-wrap gap-4 sm:gap-6">
            <p>MIT License</p>
            <p>Self-hostable & Privacy-conscious</p>
          </div>
        </div>
      </div>
    </footer>
  );
}