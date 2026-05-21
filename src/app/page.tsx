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
    <main className="min-h-screen flex flex-col items-center px-4 py-24 bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-black">
      {/* Hero Section */}
      <div className="max-w-3xl text-center">
        <h1 className="text-6xl font-extrabold mb-6 text-slate-950 dark:text-white tracking-tight drop-shadow-sm">
          DevTrack
        </h1>

        <p className="text-xl text-slate-700 dark:text-slate-300 leading-relaxed mb-10">
          Open-source developer productivity dashboard. Track coding habits,
          visualize GitHub contributions, and hit your goals.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/api/auth/signin/github?callbackUrl=/dashboard"
            className="bg-slate-950 text-white px-7 py-3 rounded-xl font-semibold hover:bg-slate-800 transition-all shadow-sm"
          >
            Sign in with GitHub
          </Link>

          <a
            href="https://github.com/Priyanshu-byte-coder/devtrack"
            target="_blank"
            rel="noopener noreferrer"
            className="border border-slate-400 text-slate-900 dark:text-white px-7 py-3 rounded-xl font-semibold hover:border-slate-950 dark:hover:border-white hover:bg-slate-100 dark:hover:bg-slate-900 transition-all"
          >
            View on GitHub
          </a>
        </div>
      </div>

      {/* Features Section */}
      <section className="w-full max-w-6xl mt-32">
        <h2 className="text-4xl font-bold text-center text-slate-950 dark:text-white mb-14">
          Everything you need to track your coding growth
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="border border-slate-200 dark:border-slate-800 rounded-2xl p-7 bg-white dark:bg-slate-900 hover:border-slate-400 dark:hover:border-slate-600 hover:shadow-lg hover:-translate-y-1 transition-all"
            >
              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-3xl mb-5">{feature.icon}</div>

              <h3 className="text-xl font-semibold text-slate-950 dark:text-white mb-3">
                {feature.title}
              </h3>

              <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}