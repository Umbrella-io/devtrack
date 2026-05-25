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
  variable: '--font-jetbrains',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

  const features = [
    {
      icon: "🔥",
      title: "Streak Tracking",
      description: "Never lose your streak and stay consistent every day.",
    },
    {
      icon: "📊",
      title: "PR Analytics",
      description: "Understand your pull request activity and review velocity.",
    },
    {
      icon: "🏆",
      title: "Goals",
      description: "Set coding goals and automatically track your progress.",
    },
    {
      icon: "🌐",
      title: "Public Profile",
      description:
        "Share your developer stats and achievements with the world.",
    },
  ];

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-24 bg-[var(--background)]">
      {/* Hero Section */}
      <div className="max-w-2xl text-center px-2">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-6 text-[var(--foreground)] tracking-tight drop-shadow-sm">
          DevTrack
        </h1>

        <p className="text-base sm:text-xl text-[var(--muted-foreground)] leading-relaxed mb-10">
          Open-source developer productivity dashboard. Track coding habits,
          visualize GitHub contributions, and hit your goals.
        </p>
async function fetchRepoStats(): Promise<RepoStats> {
  const GH_HEADERS = { Accept: 'application/vnd.github.v3+json' };
  const OPTS = (ttl: number) => ({ next: { revalidate: ttl }, headers: GH_HEADERS });

  try {
    const [repoRes, contribRes, gfiRes] = await Promise.all([
      fetch('https://api.github.com/repos/Priyanshu-byte-coder/devtrack', OPTS(3600)),
      fetch('https://api.github.com/repos/Priyanshu-byte-coder/devtrack/contributors?per_page=30', OPTS(3600)),
      fetch('https://api.github.com/repos/Priyanshu-byte-coder/devtrack/issues?labels=good+first+issue&state=open&per_page=100', OPTS(1800)),
    ]);

    if (!repoRes.ok) throw new Error('repo fetch failed');

    const repo = await repoRes.json() as Record<string, unknown>;
    const contributors = contribRes.ok ? (await contribRes.json() as Array<Record<string, unknown>>) : [];
    const gfiIssues = gfiRes.ok ? (await gfiRes.json() as unknown[]) : [];

      {/* Features Section */}
      <section className="w-full max-w-6xl mt-32">
        <h2 className="text-2xl sm:text-4xl font-bold text-center text-[var(--foreground)] mb-14">
          Everything you need to track your coding growth
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="border border-[var(--border)] rounded-2xl p-7 bg-[var(--card-muted)] hover:shadow-md transition-shadow duration-300 cursor-default"
            >
              <div className="text-2xl sm:text-4xl mb-4">{feature.icon}</div>
    return {
      stars: typeof repo.stargazers_count === 'number' ? repo.stargazers_count : 0,
      forks: typeof repo.forks_count === 'number' ? repo.forks_count : 0,
      openIssues: typeof repo.open_issues_count === 'number' ? repo.open_issues_count : 0,
      contributorCount: Array.isArray(contributors) ? contributors.length : 0,
      goodFirstIssues: Array.isArray(gfiIssues) ? gfiIssues.length : 0,
      contributors: Array.isArray(contributors)
        ? contributors.slice(0, 20).map(c => ({
            login: String(c.login ?? ''),
            avatar_url: String(c.avatar_url ?? ''),
            html_url: String(c.html_url ?? ''),
          }))
        : [],
    };
  } catch {
   
    return {
      stars: 40,
      forks: 160,
      openIssues: 307,
      contributorCount: 30,
      goodFirstIssues: 36,
      contributors: [],
    };
  }
}

export default async function HomePage() {
  const session = await getServerSession(authOptions);


  if (session) {
    redirect("/dashboard");
  }

  const repoStats = await fetchRepoStats();

  return (
    <div className={`${syne.variable} ${dmSans.variable} ${jetbrains.variable}`}>
      <LandingPage repoStats={repoStats} />
    </div>
  );
}
