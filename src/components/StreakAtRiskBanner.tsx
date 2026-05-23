"use client";

import { useEffect, useState } from "react";
import { useAccount } from "@/components/AccountContext";

interface StreakAtRiskBannerProps {
  lastCommitDate?: string | null;
  currentStreak?: number;
  hasStreakFreeze?: boolean;
}

export default function StreakAtRiskBanner({
  lastCommitDate: propsLastCommitDate,
  currentStreak: propsCurrentStreak,
  hasStreakFreeze,
}: StreakAtRiskBannerProps) {
  const { selectedAccount } = useAccount();
  const [dismissed, setDismissed] = useState(false);
  const [lastCommitDate, setLastCommitDate] = useState(propsLastCommitDate);
  const [currentStreak, setCurrentStreak] = useState(propsCurrentStreak);
  const [isAtRisk, setIsAtRisk] = useState(false);

  useEffect(() => {
    // If props weren't passed (e.g. from a Server Component), fetch them
    if (propsLastCommitDate === undefined || propsCurrentStreak === undefined) {
      const url =
        selectedAccount !== null
          ? `/api/metrics/streak?accountId=${encodeURIComponent(selectedAccount)}`
          : "/api/metrics/streak";
      fetch(url)
        .then((r) => r.json())
        .then((data) => {
          setLastCommitDate(data.lastCommitDate);
          setCurrentStreak(data.current);
        })
        .catch(() => {});
    } else {
      setLastCommitDate(propsLastCommitDate);
      setCurrentStreak(propsCurrentStreak);
    }
  }, [propsLastCommitDate, propsCurrentStreak, selectedAccount]);

  useEffect(() => {
    if (
      dismissed ||
      hasStreakFreeze ||
      currentStreak === undefined ||
      currentStreak <= 0 ||
      !lastCommitDate
    ) {
      setIsAtRisk(false);
      return;
    }

    const now = new Date();
    // 1. Check if current time is past 20:00 (8pm)
    if (now.getHours() < 20) {
      setIsAtRisk(false);
      return;
    }

    // 2. Check if lastCommitDate is NOT today
    // Convert to local YYYY-MM-DD for comparison
    const todayStr = now.toLocaleDateString("en-CA"); // "YYYY-MM-DD" in local time
    // lastCommitDate comes as "YYYY-MM-DD" from API
    if (lastCommitDate === todayStr) {
      setIsAtRisk(false);
      return;
    }

    setIsAtRisk(true);
  }, [lastCommitDate, currentStreak, hasStreakFreeze, dismissed]);

  if (!isAtRisk || dismissed) return null;

  return (
    <div className="mb-6 flex items-center justify-between rounded-lg border border-[var(--warning)]/30 bg-[var(--warning)]/10 p-4 text-[var(--warning)] shadow-sm transition-all animate-in fade-in slide-in-from-top-4">
      <div className="flex items-center gap-3">
        <span className="text-xl" role="img" aria-label="Warning">
          ⚠️
        </span>
        <div>
          <p className="font-semibold">
            No commit yet today — your streak is at risk!
          </p>
          <p className="text-sm opacity-90">
            You have a {currentStreak} day streak. Don&apos;t break it!
          </p>
        </div>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="ml-4 rounded-md p-1.5 opacity-70 hover:bg-[var(--warning)]/20 hover:opacity-100 transition-all"
        aria-label="Dismiss banner"
      >
        ✕
      </button>
    </div>
  );
}
