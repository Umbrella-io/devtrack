"use client";

import Link from "next/link";
import { motion } from "framer-motion";

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

export default function LandingContent() {
  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl text-center"
      >
        <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
         className="text-5xl font-bold mb-4 text-[var(--foreground)]">
          DevTrack
        </motion.h1>
        <motion.p 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="text-xl text-[var(--muted-foreground)] mb-8">
          Open-source developer productivity dashboard. Track coding habits,
          visualize GitHub contributions, and hit your goals.
        </motion.p>
        <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="flex gap-4 justify-center">
          <Link
            href="/api/auth/signin/github?callbackUrl=/dashboard"
            className="bg-white text-slate-900 px-6 py-3 rounded-lg font-semibold hover:bg-slate-100 border border-[var(--border)] hover:border-[var(--foreground)] hover:scale-105 transition"
          >
            Sign in with GitHub
          </Link>
          <a
            href="https://github.com/Priyanshu-byte-coder/devtrack"
            target="_blank"
            rel="noopener noreferrer"
            className="border border-[var(--border)] text-[var(--foreground)] px-6 py-3 rounded-lg font-semibold hover:border-[var(--foreground)] transition hover:bg-slate-100 hover:scale-105"
          >
            View on GitHub
          </a>
        </motion.div>
      </motion.div>

      <section className="w-full max-w-6xl mt-24">
        <motion.h2 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-3xl font-bold text-center text-[var(--foreground)] mb-12">
          Everything you need to track your coding growth
        </motion.h2>

        <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 ">
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ default: { duration: 0.9 }, scale: { duration: 0 } }}
              whileHover={{ scale: 1.05 }}
              className="border border-[var(--border)] rounded-2xl p-6 bg-[var(--card)] hover:border-[var(--muted-foreground)] hover:bg-[var(--card-muted)]"
            >
              <div className="text-4xl mb-4">{feature.icon}</div>

              <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
                {feature.title}
              </h3>

              <p className="text-[var(--muted-foreground)] text-sm leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </section>
    </main>
  );
}
