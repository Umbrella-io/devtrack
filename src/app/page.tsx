import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import LandingNav from "@/components/LandingNav";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  }

  const features = [
    {
      icon: "📊",
      title: "GitHub Analytics",
      description: "Deep insights into your GitHub activity, contributions, and coding patterns.",
    },
    {
      icon: "🔥",
      title: "Streak Tracking",
      description: "Never break your streak. Track daily consistency and stay motivated.",
    },
    {
      icon: "📈",
      title: "PR Metrics",
      description: "Understand your pull request velocity, review times, and code quality trends.",
    },
    {
      icon: "🏆",
      title: "Goal Setting",
      description: "Set coding goals and automatically track real-time progress with precision.",
    },
    {
      icon: "👥",
      title: "Team Insights",
      description: "Compare with teammates and discover performance patterns across your team.",
    },
    {
      icon: "🌐",
      title: "Public Profile",
      description: "Share your developer portfolio and showcase your achievements.",
    },
  ];


  return (
    <>
      <LandingNav />
      <main className="min-h-screen flex flex-col bg-[var(--background)]">
        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center justify-center px-4 py-20 pt-32 overflow-hidden">
          {/* Background Elements */}
          <div className="absolute inset-0 -z-10 overflow-hidden">
            {/* Gradient orbs */}
            <div className="absolute top-20 left-1/2 -translate-x-1/2 w-96 h-96 bg-[var(--accent)]/20 rounded-full blur-3xl animate-float" />
            <div className="absolute bottom-0 right-10 w-80 h-80 bg-[var(--accent)]/10 rounded-full blur-3xl" />
            <div className="absolute top-1/2 left-0 w-72 h-72 bg-[var(--accent)]/10 rounded-full blur-3xl" />
          </div>

          <div className="w-full max-w-4xl mx-auto relative z-10">
            <div className="space-y-8 sm:space-y-10 text-center">
              {/* Accent Badge */}
              <div className="inline-block">
                <span className="badge animate-slide-up" style={{ animationDelay: "0.1s" }}>
                  <span>✨</span>
                  <span>Open-source & Self-Hostable</span>
                </span>
              </div>

              {/* Main Headline */}
              <div className="space-y-6 animate-slide-up" style={{ animationDelay: "0.2s" }}>
                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-tight">
                  <span className="block text-[var(--foreground)]">
                    Track your coding
                  </span>
                  <span className="block">
                    <span className="relative inline-block">
                      <span className="absolute inset-0 bg-gradient-to-r from-[var(--accent)] via-indigo-600 to-blue-600 blur-xl opacity-30 animate-pulse" />
                      <span className="relative bg-gradient-to-r from-[var(--accent)] via-indigo-600 to-blue-600 bg-clip-text text-transparent">
                        performance
                      </span>
                    </span>
                  </span>
                </h1>
                <p className="text-xl sm:text-2xl text-[var(--muted-foreground)] leading-relaxed max-w-3xl mx-auto">
                  Deep analytics, streak tracking, and productivity insights for developers who care about their craft.
                </p>
              </div>

              {/* CTAs */}
              <div
                className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center pt-6 animate-slide-up"
                style={{ animationDelay: "0.3s" }}
              >
                <Link
                  href="/api/auth/signin/github?callbackUrl=/dashboard"
                  className="btn-primary group relative overflow-hidden"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v-3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  <span>Sign in with GitHub</span>
                </Link>
                <a
                  href="https://github.com/Priyanshu-byte-coder/devtrack"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary group"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                  <span>View on GitHub</span>
                </a>
              </div>

              {/* Hero Stats */}
              <div
                className="grid grid-cols-3 gap-6 sm:gap-12 pt-12 mt-12 border-t border-[var(--border)]/20 animate-slide-up"
                style={{ animationDelay: "0.4s" }}
              >
                <div>
                  <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-[var(--accent)] to-blue-600 bg-clip-text text-transparent">
                    10K+
                  </div>
                  <p className="text-xs sm:text-sm text-[var(--muted-foreground)] mt-1">Active Developers</p>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-[var(--accent)] to-blue-600 bg-clip-text text-transparent">
                    100%
                  </div>
                  <p className="text-xs sm:text-sm text-[var(--muted-foreground)] mt-1">Open Source</p>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-[var(--accent)] to-blue-600 bg-clip-text text-transparent">
                    Self-Host
                  </div>
                  <p className="text-xs sm:text-sm text-[var(--muted-foreground)] mt-1">Available</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="section-container bg-gradient-to-b from-[var(--card-muted)]/30 to-transparent">
          <div className="section-inner">
            <div className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl font-bold text-[var(--foreground)] mb-4">
                Powerful Features
              </h2>
              <p className="text-lg text-[var(--muted-foreground)] max-w-2xl mx-auto">
                Everything you need to understand your developer productivity and track your growth.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, idx) => (
                <div
                  key={feature.title}
                  className="group relative card-hover border border-[var(--border)] rounded-xl p-8 bg-[var(--card)] overflow-hidden"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)]/0 to-[var(--accent)]/0 group-hover:from-[var(--accent)]/5 group-hover:to-[var(--accent)]/5 transition-smooth pointer-events-none" />

                  <div className="relative space-y-4">
                    {/* Icon */}
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-lg bg-[var(--accent-soft)] text-3xl group-hover:scale-110 transition-transform duration-300">
                      {feature.icon}
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-semibold text-[var(--foreground)]">
                      {feature.title}
                    </h3>

                    {/* Description */}
                    <p className="text-[var(--muted-foreground)] leading-relaxed">
                      {feature.description}
                    </p>

                    {/* Arrow indicator */}
                    <div className="pt-4 flex items-center gap-2 text-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-sm font-medium">Learn more</span>
                      <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Dashboard Preview Section */}
        <section id="showcase" className="section-container bg-gradient-to-b from-transparent via-[var(--accent-soft)] to-transparent">
          <div className="section-inner">
            <div className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl font-bold text-[var(--foreground)] mb-4">
                Powerful Dashboard
              </h2>
              <p className="text-lg text-[var(--muted-foreground)] max-w-2xl mx-auto">
                Real-time analytics, beautiful visualizations, and actionable insights at a glance.
              </p>
            </div>

            {/* Mock Dashboard */}
            <div className="relative mx-auto max-w-5xl">
              {/* Blurred background cards */}
              <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent)]/10 to-[var(--accent)]/5 rounded-2xl blur-2xl" />

              {/* Main dashboard mockup */}
              <div className="relative rounded-2xl border border-[var(--border)]/30 bg-[var(--card)]/80 backdrop-blur-sm overflow-hidden shadow-2xl">
                {/* Header bar */}
                <div className="bg-[var(--card-muted)] px-6 py-4 border-b border-[var(--border)]/20 flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-[var(--destructive)]/80" />
                  <div className="w-3 h-3 rounded-full bg-[var(--warning)]/80" />
                  <div className="w-3 h-3 rounded-full bg-[var(--success)]/80" />
                  <span className="ml-auto text-xs text-[var(--muted-foreground)]">devtrack.example</span>
                </div>

                {/* Dashboard content */}
                <div className="p-6 sm:p-8">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    {/* Stat cards */}
                    {["Current Streak", "This Month", "PR Reviews"].map((label, i) => {
                      const stats = [
                        { label: "Current Streak", value: "47 days", icon: "🔥" },
                        { label: "This Month", value: "142 commits", icon: "📊" },
                        { label: "PR Reviews", value: "28 completed", icon: "✅" },
                      ];
                      const stat = stats[i];
                      return (
                        <div key={stat.label} className="rounded-lg bg-[var(--card-muted)]/30 p-4 border border-[var(--border)]/20">
                          <div className="text-2xl mb-2">{stat.icon}</div>
                          <p className="text-xs text-[var(--muted-foreground)] mb-1">{stat.label}</p>
                          <p className="text-lg font-semibold text-[var(--foreground)]">{stat.value}</p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Graph placeholder */}
                  <div className="rounded-lg bg-[var(--accent-soft)]/50 p-6 border border-[var(--border)]/20 h-48 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-4xl mb-2">📈</div>
                      <p className="text-sm text-[var(--muted-foreground)]">Interactive charts and analytics</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="section-container">
          <div className="section-inner">
            <div className="relative rounded-2xl overflow-hidden">
              {/* Background gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)] via-indigo-500 to-blue-600 opacity-90" />
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--accent-foreground)] rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-72 h-72 bg-[var(--accent-foreground)] rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
              </div>

              {/* Content */}
              <div className="relative px-6 sm:px-8 py-16 sm:py-20 text-center text-white space-y-8">
                <div>
                  <h2 className="text-4xl sm:text-5xl font-bold mb-4">
                    Start tracking your growth today
                  </h2>
                  <p className="text-lg opacity-90 max-w-2xl mx-auto">
                    Join developers who've already improved their productivity. Free to use, open-source, and always will be.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                  <Link
                    href="/api/auth/signin/github?callbackUrl=/dashboard"
                    className="inline-flex items-center justify-center px-8 py-3.5 rounded-lg font-semibold bg-[var(--accent-foreground)] text-[var(--accent)] hover:opacity-90 transition-smooth active:scale-95 shadow-lg"
                  >
                    Get Started Free
                  </Link>
                  <a
                    href="https://github.com/Priyanshu-byte-coder/devtrack"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-8 py-3.5 rounded-lg font-semibold border-2 border-[var(--accent-foreground)] text-[var(--accent-foreground)] hover:bg-[var(--accent-foreground)]/10 transition-smooth active:scale-95"
                  >
                    Star on GitHub
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="w-full border-t border-[var(--border)]/20 bg-[var(--card-muted)]/30">
          <div className="section-container">
            <div className="section-inner">
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-8 mb-12">
                {/* Brand */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent)] to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                      D
                    </div>
                    <span className="font-bold">DevTrack</span>
                  </div>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Open-source developer productivity dashboard
                  </p>
                </div>

                {/* Product */}
                <div>
                  <h4 className="font-semibold text-[var(--foreground)] mb-4">Product</h4>
                  <ul className="space-y-2 text-sm">
                    <li>
                      <Link href="#features" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
                        Features
                      </Link>
                    </li>
                    <li>
                      <Link href="#showcase" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
                        Dashboard
                      </Link>
                    </li>
                  </ul>
                </div>

                {/* Community */}
                <div>
                  <h4 className="font-semibold text-[var(--foreground)] mb-4">Community</h4>
                  <ul className="space-y-2 text-sm">
                    <li>
                      <a
                        href="https://github.com/Priyanshu-byte-coder/devtrack"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                      >
                        GitHub
                      </a>
                    </li>
                    <li>
                      <Link href="/api/auth/signin/github?callbackUrl=/dashboard" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
                        Sign In
                      </Link>
                    </li>
                  </ul>
                </div>

                {/* Legal */}
                <div>
                  <h4 className="font-semibold text-[var(--foreground)] mb-4">Legal</h4>
                  <ul className="space-y-2 text-sm">
                    <li>
                      <a href="#" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
                        Privacy
                      </a>
                    </li>
                    <li>
                      <a href="#" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
                        License
                      </a>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Bottom */}
              <div className="border-t border-[var(--border)]/20 pt-8 flex flex-col sm:flex-row items-center justify-between">
                <p className="text-sm text-[var(--muted-foreground)]">
                  © 2026 DevTrack. Open-source and MIT licensed.
                </p>
                <div className="flex items-center gap-4 mt-4 sm:mt-0">
                  <a
                    href="https://github.com/Priyanshu-byte-coder/devtrack"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v-3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
