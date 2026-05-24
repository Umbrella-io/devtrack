import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

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

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-16 md:py-20">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8%] top-[-10%] h-72 w-72 rounded-full bg-[var(--accent)]/20 blur-3xl" />
        <div className="absolute right-[-10%] top-[15%] h-80 w-80 rounded-full bg-[var(--accent-secondary)]/25 blur-3xl" />
      </div>

      <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center">
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
  );
}
