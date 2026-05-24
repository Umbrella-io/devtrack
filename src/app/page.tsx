import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

interface Contributor {
  login: string;
  avatar_url: string;
  html_url: string;
  contributions: number;
}

async function fetchContributors(): Promise<Contributor[]> {
  try {
    const token = process.env.GITHUB_TOKEN;
    const headers: Record<string, string> = {
      "User-Agent": "DevTrack-App",
      Accept: "application/vnd.github+json",
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(
      "https://api.github.com/repos/Priyanshu-byte-coder/devtrack/contributors",
      {
        headers,
        next: { revalidate: 3600 },
      }
    );
    if (!res.ok) {
      console.error(`GitHub API error: ${res.status}`);
      return [];
    }
    const data = await res.json();
    if (Array.isArray(data)) {
      return data.map((item: any) => ({
        login: item.login,
        avatar_url: item.avatar_url,
        html_url: item.html_url,
        contributions: item.contributions,
      }));
    }
    return [];
  } catch (error) {
    console.error("Failed to fetch contributors from GitHub:", error);
    return [];
  }
}

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  }

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

  const contributors = await fetchContributors();
  const sortedContributors = [...contributors].sort((a, b) => b.contributions - a.contributions);
  const top3 = sortedContributors.slice(0, 3);
  const rest = sortedContributors.slice(3);
  const firstPlace = top3[0];
  const secondPlace = top3[1];
  const thirdPlace = top3[2];

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-20">
      <div className="max-w-2xl text-center fade-up">
        <h1 className="text-5xl md:text-6xl font-bold mb-4 text-[var(--foreground)]">
          DevTrack
        </h1>

        <p className="text-xl text-[var(--muted-foreground)] leading-relaxed mb-10">
          Open-source developer productivity dashboard. Track coding habits,
          visualize GitHub contributions, and hit your goals.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/api/auth/signin/github?callbackUrl=/dashboard"
            className="bg-[var(--foreground)] text-[var(--background)] px-7 py-3 rounded-xl font-semibold hover:opacity-90 transition-all shadow-sm"
          >
            Sign in with GitHub
          </Link>

          <a
            href="https://github.com/Priyanshu-byte-coder/devtrack"
            target="_blank"
            rel="noopener noreferrer"
            className="border border-[var(--border)] text-[var(--foreground)] px-7 py-3 rounded-xl font-semibold hover:border-[var(--foreground)] hover:bg-[var(--card-muted)] transition-all"
          >
            View on GitHub
          </a>
        </div>
      </div>

      {/* Features Section */}
      <section className="w-full max-w-6xl mt-32">
        <h2 className="text-4xl font-bold text-center text-[var(--foreground)] mb-14">
          Everything you need to track your coding growth
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="border border-[var(--border)] rounded-2xl p-7 bg-[var(--card-muted)] hover:border-[var(--muted-foreground)] hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
            >
              <div className="w-14 h-14 rounded-2xl bg-[var(--card)] flex items-center justify-center text-3xl mb-5">
                {feature.icon}
              </div>

              <h3 className="text-xl font-semibold text-[var(--foreground)] mb-3">
                {feature.title}
              </h3>

              <p className="text-[var(--muted-foreground)] text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {contributors.length > 0 && (
        <section className="w-full max-w-6xl mt-28 mb-16 fade-up">
          <h2 className="text-3xl font-bold text-center text-[var(--foreground)] mb-3">
            Top Contributors
          </h2>
          <p className="text-center text-[var(--muted-foreground)] text-sm max-w-lg mx-auto mb-12">
            Meet the developers who are actively shaping DevTrack. Thank you for making our open-source productivity platform grow!
          </p>

          {/* Podium for top 3 */}
          <div className="flex flex-row items-end justify-center gap-2 sm:gap-6 mt-12 mb-16 w-full max-w-4xl mx-auto px-2">
            {/* 2nd Place */}
            {secondPlace && (
              <div className="flex flex-col items-center bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 sm:p-5 shadow-sm w-[30%] max-w-[190px] h-52 sm:h-60 flex-shrink-0 transition duration-300 hover:scale-[1.03] hover:shadow-md">
                <div className="relative mb-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={secondPlace.avatar_url}
                    alt={secondPlace.login}
                    className="w-14 h-14 sm:w-18 sm:h-18 rounded-full border-4 border-[var(--border)] object-cover shadow-sm"
                  />
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[var(--control-hover)] text-[var(--foreground)] text-[10px] sm:text-xs font-extrabold px-2 py-0.5 rounded-full shadow-sm border border-[var(--border)]">
                    2nd
                  </div>
                </div>
                <div className="text-center mt-2 w-full font-bold">
                  <a
                    href={secondPlace.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block font-bold text-xs sm:text-sm text-[var(--foreground)] hover:text-[var(--accent)] hover:underline truncate"
                  >
                    @{secondPlace.login}
                  </a>
                  <span className="inline-block mt-2 px-2 py-0.5 rounded-full bg-[var(--control)] text-[var(--muted-foreground)] text-[10px] sm:text-xs font-semibold">
                    {secondPlace.contributions} commits
                  </span>
                </div>
              </div>
            )}

            {/* 1st Place */}
            {firstPlace && (
              <div className="flex flex-col items-center bg-[var(--card)] border-2 border-[var(--warning)] rounded-2xl p-5 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgba(245,158,11,0.15)] w-[36%] max-w-[220px] h-60 sm:h-72 flex-shrink-0 relative transition duration-300 hover:scale-[1.03] z-10">
                <div className="absolute -top-7 text-3xl sm:text-4xl animate-bounce" style={{ animationDuration: '3s' }}>👑</div>
                <div className="relative mb-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={firstPlace.avatar_url}
                    alt={firstPlace.login}
                    className="w-16 h-16 sm:w-22 sm:h-22 rounded-full border-4 border-[var(--warning)] object-cover shadow-md"
                  />
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[var(--warning)] text-[var(--background)] text-[10px] sm:text-xs font-extrabold px-2.5 py-0.5 rounded-full shadow-sm">
                    1st
                  </div>
                </div>
                <div className="text-center mt-3 w-full font-bold">
                  <a
                    href={firstPlace.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block font-bold text-xs sm:text-base text-[var(--foreground)] hover:text-[var(--accent)] hover:underline truncate"
                  >
                    @{firstPlace.login}
                  </a>
                  <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] text-[10px] sm:text-xs font-semibold">
                    {firstPlace.contributions} commits
                  </span>
                </div>
              </div>
            )}

            {/* 3rd Place */}
            {thirdPlace && (
              <div className="flex flex-col items-center bg-[var(--card)] border border-[var(--border)] rounded-2xl p-3 sm:p-4 shadow-sm w-[26%] max-w-[170px] h-44 sm:h-52 flex-shrink-0 transition duration-300 hover:scale-[1.03] hover:shadow-md">
                <div className="relative mb-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thirdPlace.avatar_url}
                    alt={thirdPlace.login}
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-4 border-[var(--border)] object-cover shadow-sm"
                  />
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[var(--border)] text-[var(--muted-foreground)] text-[10px] sm:text-xs font-extrabold px-2 py-0.5 rounded-full shadow-sm">
                    3rd
                  </div>
                </div>
                <div className="text-center mt-1 w-full font-bold">
                  <a
                    href={thirdPlace.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block font-bold text-[10px] sm:text-xs text-[var(--foreground)] hover:text-[var(--accent)] hover:underline truncate"
                  >
                    @{thirdPlace.login}
                  </a>
                  <span className="inline-block mt-2 px-1.5 py-0.5 rounded-full bg-[var(--control)] text-[var(--muted-foreground)] text-[9px] sm:text-xs font-semibold">
                    {thirdPlace.contributions} commits
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Rest of Contributors Grid */}
          {rest.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-8 w-full">
              {rest.map((contrib, index) => {
                const rank = index + 4;
                return (
                  <div
                    key={contrib.login}
                    className="flex items-center gap-3 p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:border-[var(--muted-foreground)] hover:scale-[1.02] transition duration-200"
                  >
                    <span className="text-xs font-extrabold text-[var(--muted-foreground)] bg-[var(--control)] px-2 py-1 rounded border border-[var(--border)] min-w-[32px] text-center">
                      #{rank}
                    </span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={contrib.avatar_url}
                      alt={contrib.login}
                      className="w-10 h-10 rounded-full border border-[var(--border)] object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <a
                          href={contrib.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block font-semibold text-sm text-[var(--foreground)] hover:text-[var(--accent)] hover:underline truncate"
                        >
                          @{contrib.login}
                        </a>
                      </div>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {contrib.contributions} commits
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
