"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const year = new Date().getFullYear();

export default function Footer() {
  const pathname = usePathname();
  const isLanding = pathname === "/";

  if (pathname === "/wrapped") return null;

  return (
    <footer className={`mt-auto border-t relative overflow-hidden ${isLanding ? 'bg-transparent border-slate-900/40' : 'border-[var(--border)] bg-[var(--background)]'}`}>
      {/* Subtle top gradient using the accent color */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(129,140,248,0.05),transparent_50%)] pointer-events-none" />
      
      <div className="relative mx-auto w-full max-w-7xl px-6 py-10 sm:px-8 lg:px-12">
        <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <div className="inline-flex items-center rounded-full border border-[#818cf8]/20 bg-[#818cf8]/10 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#818cf8]">
              Open source developer dashboard
            </div>
            <h2 
              className="mt-5 text-2xl font-extrabold text-[var(--foreground)] sm:text-3xl tracking-tight"
              style={{ fontFamily: "var(--font-syne, system-ui, sans-serif)", letterSpacing: "-0.03em" }}
            >
              DevTrack keeps your<br />coding story in one place.
            </h2>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-[var(--muted-foreground)]" style={{ fontFamily: "var(--font-jetbrains, ui-monospace, monospace)" }}>
              Track GitHub contributions, PR velocity, streaks, goals, and
              community activity with a dashboard built for contributors who
              work in public.
            </p>
          </div>

          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--foreground)]" style={{ fontFamily: "var(--font-jetbrains, ui-monospace, monospace)" }}>
              Product
            </h3>
            <div className="mt-6 flex flex-col gap-4 text-[14px] text-[var(--muted-foreground)]">
              <Link className="transition-all duration-200 hover:text-[var(--foreground)] hover:translate-x-1 w-fit" href="/">
                Home
              </Link>
              <Link className="transition-all duration-200 hover:text-[var(--foreground)] hover:translate-x-1 w-fit" href="/dashboard">
                Dashboard
              </Link>
              <Link className="transition-all duration-200 hover:text-[var(--foreground)] hover:translate-x-1 w-fit" href="/leaderboard">
                Leaderboard
              </Link>
              <Link className="transition-all duration-200 hover:text-[var(--foreground)] hover:translate-x-1 w-fit" href="/contact">
                Contact
              </Link>
            </div>
          </div>

          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--foreground)]" style={{ fontFamily: "var(--font-jetbrains, ui-monospace, monospace)" }}>
              Community
            </h3>
            <div className="mt-6 flex flex-col gap-4 text-[14px] text-[var(--muted-foreground)]">
              <a
                className="transition-all duration-200 hover:text-[var(--foreground)] hover:translate-x-1 w-fit"
                href="https://github.com/Priyanshu-byte-coder/devtrack/discussions"
                target="_blank"
                rel="noopener noreferrer"
              >
                Discussions
              </a>
              <a
                className="transition-all duration-200 hover:text-[var(--foreground)] hover:translate-x-1 w-fit"
                href="https://github.com/Priyanshu-byte-coder/devtrack/issues"
                target="_blank"
                rel="noopener noreferrer"
              >
                Issues
              </a>
              <a
                className="transition-all duration-200 hover:text-[var(--foreground)] hover:translate-x-1 w-fit"
                href="https://github.com/Priyanshu-byte-coder/devtrack"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub Repository
              </a>
            </div>
          </div>
   
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--foreground)]" style={{ fontFamily: "var(--font-jetbrains, ui-monospace, monospace)" }}>
              Contact
            </h3>
            <div className="mt-6 flex flex-col gap-4 text-[14px] text-[var(--muted-foreground)]">
              <a
                className="transition-all duration-200 hover:text-[var(--foreground)] hover:translate-x-1 w-fit"
                href="https://www.linkedin.com/in/priyanshu-doshi-21a54230a/"
                target="_blank"
                rel="noopener noreferrer"
              >
                LinkedIn
              </a>
              <a
                className="transition-all duration-200 hover:text-[var(--foreground)] hover:translate-x-1 w-fit"
                href="https://github.com/Priyanshu-byte-coder"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
              </a>
              <a
                className="transition-all duration-200 hover:text-[var(--foreground)] hover:translate-x-1 w-fit"
                href="https://portfolio-eta-gilt-84.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Portfolio
              </a>
              <a
                className="transition-all duration-200 hover:text-[var(--foreground)] hover:translate-x-1 w-fit"
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
          className="mt-10 flex flex-col gap-4 border-t border-[var(--border)] pt-6 text-[12px] text-[var(--muted-foreground)] sm:flex-row sm:items-center sm:justify-between"
          style={{ fontFamily: "var(--font-jetbrains, ui-monospace, monospace)" }}
        >
          <p>© {year} DevTrack. Built for open-source contributors.</p>
          <div className="flex gap-6">
            <p>MIT License</p>
            <p>Self-hostable & Privacy-conscious</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
