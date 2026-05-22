"use client";

import NotificationBell from "@/components/NotificationBell";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";

import AccountToggle from "@/components/AccountToggle";
import SignOutButton from "@/components/SignOutButton";
import ThemeToggle from "@/components/ThemeToggle";
import UserAvatar from "@/components/UserAvatar";
import KeyboardShortcuts from "@/components/KeyboardShortcuts";

import {
  LayoutDashboard,
  Sparkles,
  Activity,
} from "lucide-react";

export default function DashboardHeader() {
  const { data: session } = useSession();
  const [isPublic, setIsPublic] = useState<boolean | null>(null);

  useEffect(() => {
    if (!session) {
      setIsPublic(null);
      return;
    }

    async function loadSettings() {
      try {
        const res = await fetch("/api/user/settings");

        if (res.ok) {
          const data = await res.json();
          setIsPublic(data.is_public === true);
        } else {
          setIsPublic(false);
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
        setIsPublic(false);
      }
    }

    loadSettings();
  }, [session]);

  return (
    <motion.header
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="relative overflow-hidden mb-8 rounded-3xl border border-[var(--border)] hover:border-[var(--accent)] bg-gradient-to-br from-[var(--background)] via-[var(--card)] to-[var(--card-muted)] p-6 md:p-8 shadow-2xl backdrop-blur-xl transition-all duration-500"
    >

      {/* Animated Background Blobs */}
      <div className="absolute -top-20 -left-20 w-72 h-72 bg-[var(--accent)] opacity-20 rounded-full blur-3xl animate-pulse"></div>

      <div className="absolute bottom-0 right-0 w-72 h-72 bg-[var(--accent)] opacity-20 rounded-full blur-3xl animate-pulse"></div>

      {/* Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]"></div>

      <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-8">

        {/* LEFT SECTION */}
        <div>

          {/* Heading */}
          <div className="flex items-center gap-4">

            {/* Floating Dashboard Logo */}
            <motion.div
              animate={{
                y: [0, -6, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
              className="p-3 rounded-2xl bg-[var(--accent)] shadow-lg"
            >
              <LayoutDashboard className="text-[var(--foreground)] w-7 h-7" />
            </motion.div>

            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-[var(--foreground)] via-[var(--accent)] to-[var(--foreground)] bg-clip-text text-transparent">
                Dashboard
              </h1>

              <div className="flex items-center gap-2 mt-2 text-[var(--accent)]">
                <Sparkles className="w-4 h-4" />

                <span className="text-sm font-medium">
                  Developer Productivity Hub
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          <p className="mt-5 max-w-2xl text-sm md:text-lg text-[var(--muted-foreground)] leading-relaxed">
            Track coding habits, analyze GitHub contributions,
            and monitor your open-source journey with powerful insights 🚀
          </p>

          {/* Welcome */}
          <p className="mt-3 text-sm text-[var(--muted-foreground)]">
            Welcome back,{" "}
            <span className="text-[var(--accent)] font-semibold">
              {session?.user?.name || "Developer"}
            </span>
          </p>

          {/* Status Badge */}
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--card-muted)] border border-[var(--border)] text-[var(--accent)] text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse"></span>
            System Active
          </div>

          {/* Feature Chips */}
          <div className="mt-5 flex flex-wrap gap-3">

            <motion.div
              whileHover={{ scale: 1.05, y: -4 }}
              className="px-4 py-2 rounded-xl bg-[var(--card-muted)] border border-[var(--border)] text-sm text-[var(--muted-foreground)] cursor-pointer"
            >
              🚀 Productivity Insights
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05, y: -4 }}
              className="px-4 py-2 rounded-xl bg-[var(--card-muted)] border border-[var(--border)] text-sm text-[var(--muted-foreground)] cursor-pointer"
            >
              📈 GitHub Analytics
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05, y: -4 }}
              className="px-4 py-2 rounded-xl bg-[var(--card-muted)] border border-[var(--border)] text-sm text-[var(--muted-foreground)] cursor-pointer"
            >
              🔥 Contribution Tracking
            </motion.div>

          </div>
        </div>

        {/* RIGHT SECTION */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7 }}
          className="flex flex-wrap items-center gap-4"
        >

          {/* Share Profile */}
          {isPublic === true && session?.githubLogin && (
            <motion.a
              whileHover={{
                scale: 1.06,
                y: -3,
              }}
              whileTap={{
                scale: 0.95,
              }}
              href={`/u/${session.githubLogin}`}
              target="_blank"
              rel="noopener noreferrer"
              className="relative overflow-hidden px-5 py-3 rounded-2xl bg-[var(--accent)] text-[var(--accent-foreground)] text-sm font-semibold shadow-lg transition-all duration-300"
            >
              Share Profile
            </motion.a>
          )}

          {/* Controls */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-muted)] backdrop-blur-lg px-4 py-3 shadow-md"
          >

            <motion.div
              whileHover={{ scale: 1.15, rotate: 5 }}
              whileTap={{ scale: 0.9 }}
            >
              <KeyboardShortcuts />
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.15, rotate: 5 }}
              whileTap={{ scale: 0.9 }}
              className="relative"
            >
              <NotificationBell />

              <span className="absolute -top-1 -right-1 w-3 h-3 bg-[var(--destructive)] rounded-full animate-ping"></span>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
            >
              <UserAvatar />
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.15, rotate: 20 }}
              whileTap={{ scale: 0.9 }}
            >
              <ThemeToggle />
            </motion.div>

            <motion.div
              animate={{
                y: [0, -10, 0],
                rotate: [0, 5, -5, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
              whileHover={{
                scale: 1.2,
                backgroundColor: "var(--accent)",
              }}
              whileTap={{
                scale: 0.8,
              }}
              className="p-2 rounded-xl"
            >
              <SignOutButton />
            </motion.div>

          </motion.div>
        </motion.div>
      </div>

      {/* Bottom Toggle */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="relative z-10 mt-7"
      >
        <AccountToggle />
      </motion.div>

      {/* Floating Activity Badge */}
      <motion.div
        animate={{
          y: [0, -4, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
        }}
        className="absolute top-6 right-6 hidden lg:flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--card-muted)] border border-[var(--border)] text-[var(--accent-foreground)] text-xs backdrop-blur-lg"
      >
        <Activity className="w-4 h-4 animate-pulse" />
        Live Analytics
      </motion.div>
    </motion.header>
  );
}