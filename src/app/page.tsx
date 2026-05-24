import { Syne, DM_Sans, JetBrains_Mono } from 'next/font/google';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import LandingPage, { type RepoStats } from "@/components/landing/LandingPage";

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  weight: ['700', '800'],
  display: 'swap',
});
const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  weight: ['400', '500', '600'],
  display: 'swap',
});
const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  return (
    <div className={`${syne.variable} ${dmSans.variable} ${jetbrains.variable}`}>
      <LandingPage repoStats={repoStats} />
    </div>
  );
        <div className="w-full max-w-3xl rounded-3xl border border-[var(--border)] bg-[var(--card)]/85 p-10 text-center shadow-[var(--shadow-soft)] backdrop-blur-sm fade-up">
          <span className="inline-flex items-center rounded-full border border-[var(--accent)]/25 bg-[var(--accent-soft)] px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
            Open-source dev productivity
          </span>
          <h1 className="mt-6 text-5xl font-bold tracking-tight text-[var(--foreground)] md:text-6xl">
            DevTrack
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-[var(--muted-foreground)] md:text-xl">
            Open-source developer productivity dashboard. Track coding habits,
            visualize GitHub contributions, and hit your goals.
          </p>
          <div className="mt-8 flex flex-wrap gap-4 justify-center">
            <Link
              href="/api/auth/signin/github?callbackUrl=/dashboard"
              className="primary-button rounded-xl px-6 py-3 font-semibold"
            >
              Sign in with GitHub
            </Link>
            <a
              href="https://github.com/Priyanshu-byte-coder/devtrack"
              target="_blank"
              rel="noopener noreferrer"
              className="secondary-button rounded-xl px-6 py-3 font-semibold"
            >
              View on GitHub
            </a>
          </div>
        </div>

        <section className="w-full max-w-6xl mt-20 fade-up">
          <h2 className="text-3xl font-bold text-center text-[var(--foreground)] mb-12">
            Everything you need to track your coding growth
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="surface-card rounded-2xl p-6 transition-transform duration-200 hover:-translate-y-1"
              >
                <div className="mb-4 inline-flex rounded-xl border border-[var(--border)] bg-[var(--control)] p-2 text-3xl">
                  {feature.icon}
                </div>

                <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
                  {feature.title}
                </h3>

                <p className="text-[var(--muted-foreground)] text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
>>>>>>> 375a1b5 (feat(ui): modernize interface with light blue and white theme (#924))
  );
}
