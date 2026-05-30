
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import LandingPage, { type RepoStats } from "@/components/landing/LandingPage";
import { supabaseAdmin } from "@/lib/supabase";

import { Syne, DM_Sans, JetBrains_Mono } from "next/font/google";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  weight: ["700", "800"],
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["400", "500", "600"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

async function fetchRepoStats(): Promise<RepoStats> {
  const token = process.env.GITHUB_TOKEN;
  const GH_HEADERS: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const OPTS = (ttl: number) => ({ next: { revalidate: ttl }, headers: GH_HEADERS });

  try {
    const [repoRes, contribRes, gfiRes] = await Promise.all([
      fetch("https://api.github.com/repos/Priyanshu-byte-coder/devtrack", OPTS(3600)),
      fetch("https://api.github.com/repos/Priyanshu-byte-coder/devtrack/contributors?per_page=30", OPTS(3600)),
      fetch("https://api.github.com/repos/Priyanshu-byte-coder/devtrack/issues?labels=good+first+issue&state=open&per_page=100", OPTS(1800)),
    ]);

    if (!repoRes.ok) throw new Error("repo fetch failed");

    const repo = (await repoRes.json()) as Record<string, unknown>;
    const contributors = contribRes.ok ? ((await contribRes.json()) as Array<Record<string, unknown>>) : [];
    const gfiIssues = gfiRes.ok ? ((await gfiRes.json()) as unknown[]) : [];

    let mappedContributors = Array.isArray(contributors)
      ? contributors.slice(0, 20).map((c) => ({
          login: String(c.login ?? ""),
          avatar_url: String(c.avatar_url ?? ""),
          html_url: String(c.html_url ?? ""),
          isSponsor: false,
        }))
      : [];

    if (mappedContributors.length > 0 && supabaseAdmin) {
      try {
        const logins = mappedContributors.map((c) => c.login);
        const { data: sponsors } = await supabaseAdmin
          .from("users")
          .select("github_login")
          .in("github_login", logins)
          .eq("is_sponsor", true);

        if (sponsors && sponsors.length > 0) {
          const sponsorSet = new Set(sponsors.map((s: { github_login: string }) => s.github_login));
          mappedContributors = mappedContributors.map((c) => ({
            ...c,
            isSponsor: sponsorSet.has(c.login),
          }));
        }
      } catch {
        // Supabase not configured locally — skip sponsor enrichment, show contributors as-is
      }
    }

    return {
      stars: typeof repo.stargazers_count === "number" ? repo.stargazers_count : 0,
      forks: typeof repo.forks_count === "number" ? repo.forks_count : 0,
      openIssues: typeof repo.open_issues_count === "number" ? repo.open_issues_count : 0,
      contributorCount: Array.isArray(contributors) ? contributors.length : 0,
      goodFirstIssues: Array.isArray(gfiIssues) ? gfiIssues.length : 0,
      contributors: mappedContributors,
    };
  } catch {
    return {
      stars: 0,
      forks: 0,
      openIssues: 0,
      contributorCount: 0,
      goodFirstIssues: 0,
      contributors: [],
    };
  }
}

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  }

  const stats = await fetchRepoStats();

  return (
<<<<<<< HEAD
    <div className={`${syne.variable} ${dmSans.variable} ${jetbrains.variable}`}>
      <LandingPage repoStats={stats} />
    </div>
=======
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
>>>>>>> 393b334 (fix: add keyboard navigation and ARIA labels for accessibility (closes #1308))
  );
}