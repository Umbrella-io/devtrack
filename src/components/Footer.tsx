import Link from "next/link";

const year = new Date().getFullYear();

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-[var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.02),transparent)]">
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
          <div>
            <div className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--control)] px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
              Open source developer dashboard
            </div>
            <h2 className="mt-4 text-2xl font-semibold text-[var(--card-foreground)] sm:text-3xl">
              DevTrack keeps your coding story in one place.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--muted-foreground)] sm:text-base">
              Track GitHub contributions, PR velocity, streaks, goals, and
              community activity with a dashboard built for contributors who
              work in public.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--card-foreground)]">
              Product
            </h3>
            <div className="mt-4 flex flex-col gap-3 text-sm text-[var(--muted-foreground)]">
              <Link className="transition-colors hover:text-[var(--card-foreground)]" href="/">
                Home
              </Link>
              <Link className="transition-colors hover:text-[var(--card-foreground)]" href="/dashboard">
                Dashboard
              </Link>
              <Link className="transition-colors hover:text-[var(--card-foreground)]" href="/leaderboard">
                Leaderboard
              </Link>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--card-foreground)]">
              Community
            </h3>
            <div className="mt-4 flex flex-col gap-3 text-sm text-[var(--muted-foreground)]">
              <a
                className="transition-colors hover:text-[var(--card-foreground)]"
                href="https://github.com/Priyanshu-byte-coder/devtrack/discussions"
                target="_blank"
                rel="noopener noreferrer"
              >
                Discussions
              </a>
              <a
                className="transition-colors hover:text-[var(--card-foreground)]"
                href="https://github.com/Priyanshu-byte-coder/devtrack/issues"
                target="_blank"
                rel="noopener noreferrer"
              >
                Issues
              </a>
              <a
                className="transition-colors hover:text-[var(--card-foreground)]"
                href="https://github.com/Priyanshu-byte-coder/devtrack"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub Repository
              </a>
            </div>
          </div>
   
            <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--card-foreground)]">
              Contact
            </h3>
            <div className="mt-4 flex flex-col gap-3 text-sm text-[var(--muted-foreground)]">
              <a
                className="transition-colors hover:text-[var(--card-foreground)]"
                href="https://www.linkedin.com/in/priyanshu-doshi-21a54230a/"
                target="_blank"
                rel="noreferrer"
              >
                LinkedIn
              </a>
              <a
                className="transition-colors hover:text-[var(--card-foreground)]"
                href="https://github.com/Priyanshu-byte-coder"
                target="_blank"
                rel="noreferrer"
              >
                GitHub
              </a>
              <a
                className="transition-colors hover:text-[var(--card-foreground)]"
                href="https://portfolio-eta-gilt-84.vercel.app/"
                target="_blank"
                rel="noreferrer"
              >
                Portfolio
              </a>
              <a
                className="transition-colors hover:text-[var(--card-foreground)]"
                href="mailto:doshipriyanshu3@gmail.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                Email
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-[var(--border)] pt-6 text-sm text-[var(--muted-foreground)] sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} DevTrack. Built for open-source contributors.</p>
          <p>Self-hostable, privacy-conscious, and designed for daily use.</p>
        </div>
      </div>
    </footer>
  );
}
