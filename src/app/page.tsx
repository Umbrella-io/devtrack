import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main
      id="main-content"
      className="min-h-screen flex flex-col items-center justify-center px-4"
      aria-label="DevTrack home page"
    >
      <div className="max-w-2xl text-center">
        <h1 className="text-5xl font-bold mb-4 text-white">DevTrack</h1>
        <p className="text-xl text-slate-400 mb-8">
          Open-source developer productivity dashboard. Track coding habits,
          visualize GitHub contributions, and hit your goals.
        </p>
        <nav aria-label="Primary actions">
          <ul className="flex gap-4 justify-center list-none p-0 m-0">
            <li>
              <Link
                href="/api/auth/signin/github?callbackUrl=/dashboard"
                className="bg-white text-slate-900 px-6 py-3 rounded-lg font-semibold hover:bg-slate-100 transition focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Sign in with GitHub
              </Link>
            </li>
            <li>
              <a
                href="https://github.com/Priyanshu-byte-coder/devtrack"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="View DevTrack source code on GitHub (opens in new tab)"
                className="border border-slate-600 text-white px-6 py-3 rounded-lg font-semibold hover:border-slate-400 transition"
              >
                View on GitHub
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </main>
  );
}