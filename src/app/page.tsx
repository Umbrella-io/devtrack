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
    <main className="min-h-screen flex flex-col items-center px-4 py-20">
      <div className="max-w-2xl text-center">
        <h1 className="text-5xl font-bold mb-4 text-[var(--foreground)]">
          DevTrack
        </h1>
        <p className="text-xl text-[var(--muted-foreground)] mb-8">
          Open-source developer productivity dashboard. Track coding habits,
          visualize GitHub contributions, and hit your goals.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/api/auth/signin/github?callbackUrl=/dashboard"
            className="bg-[var(--foreground)] text-[var(--background)] px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition"
          >
            Sign in with GitHub
          </Link>
          <a
            href="https://github.com/Priyanshu-byte-coder/devtrack"
            target="_blank"
            rel="noopener noreferrer"
            className="border border-[var(--border)] text-[var(--foreground)] px-6 py-3 rounded-lg font-semibold hover:border-[var(--foreground)] transition"
          >
            View on GitHub
          </a>
        </div>
      </div>

      <section className="w-full max-w-6xl mt-24">
        <h2 className="text-3xl font-bold text-center text-[var(--foreground)] mb-12">
          Everything you need to track your coding growth
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="border border-[var(--border)] rounded-2xl p-6 bg-[var(--card)] hover:border-[var(--muted-foreground)] transition"
            >
              <div className="text-4xl mb-4">{feature.icon}</div>

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
    </main>
  );
}
