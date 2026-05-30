"use client";

import { useEffect, useRef, useState } from "react";

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
  const [dismissed, setDismissed] = useState(false);
  const [lastCommitDate, setLastCommitDate] = useState(propsLastCommitDate);
  const [currentStreak, setCurrentStreak] = useState(propsCurrentStreak);
  const [isAtRisk, setIsAtRisk] = useState(false);
  const dismissBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (propsLastCommitDate === undefined || propsCurrentStreak === undefined) {
      fetch("/api/metrics/streak")
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
  }, [propsLastCommitDate, propsCurrentStreak]);

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
    if (now.getHours() < 20) {
      setIsAtRisk(false);
      return;
    }

    const todayStr = now.toLocaleDateString("en-CA");
    if (lastCommitDate === todayStr) {
      setIsAtRisk(false);
      return;
    }

    setIsAtRisk(true);
  }, [lastCommitDate, currentStreak, hasStreakFreeze, dismissed]);

  if (!isAtRisk || dismissed) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className="mb-6 flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-amber-500 shadow-sm transition-all animate-in fade-in slide-in-from-top-4"
    >
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="text-xl">
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
        ref={dismissBtnRef}
        onClick={() => setDismissed(true)}
        aria-label="Dismiss streak at risk warning"
        className="ml-4 rounded-md p-1.5 opacity-70 hover:bg-amber-500/20 hover:opacity-100 transition-all"
      >
        <span aria-hidden="true">✕</span>
      </button>
    </div>
  );
}