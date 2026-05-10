import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="max-w-2xl text-center">
        <h1 className="text-5xl font-bold mb-4 text-white">DevTrack</h1>
        <p className="text-xl text-slate-400 mb-8">
          Open-source developer productivity dashboard. Track coding habits,
          visualize GitHub contributions, and hit your goals.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/api/auth/signin/github?callbackUrl=/dashboard"
            className="bg-white text-slate-900 px-6 py-3 rounded-lg font-semibold hover:bg-slate-100 transition"
          >
            Sign in with GitHub
          </Link>
          <a
            href="https://github.com/Priyanshu-byte-coder/devtrack"
            target="_blank"
            rel="noopener noreferrer"
            className="border border-slate-600 text-white px-6 py-3 rounded-lg font-semibold hover:border-slate-400 transition"
          >
            View on GitHub
          </a>
        </div>
      </div>
    </main>
  );
}
