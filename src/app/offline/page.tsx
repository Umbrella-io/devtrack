import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Offline | DevTrack",
  description: "DevTrack is temporarily unavailable because you are offline.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function OfflinePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(129,140,248,0.18),_transparent_36%),linear-gradient(180deg,_#020617_0%,_#0f172a_100%)] px-6 py-10 text-slate-100">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-3xl items-center justify-center">
        <section className="w-full rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-slate-950/40 backdrop-blur md:p-12">
          <div className="mb-6 inline-flex rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-200">
            Offline mode
          </div>
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
            You are offline.
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-300">
            DevTrack cannot reach the network right now, but the app shell is
            still available. Reconnect to refresh your GitHub metrics and
            contribution data.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full bg-cyan-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              Try again
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 py-3 font-semibold text-white transition hover:border-white/25 hover:bg-white/10"
            >
              Open dashboard shell
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
