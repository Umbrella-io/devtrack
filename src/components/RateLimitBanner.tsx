"use client";

import { useEffect, useMemo, useState } from "react";

interface RateLimitBannerProps {
  resetAt: number;
}

function toResetDate(resetAt: number): Date {
  // GitHub reset timestamps are usually epoch seconds; support ms as well.
  const ms = resetAt < 1_000_000_000_000 ? resetAt * 1000 : resetAt;
  return new Date(ms);
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return "a few seconds";

  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes <= 0) return `${seconds}s`;
  if (minutes < 60) return `${minutes}m ${seconds}s`;

  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  return `${hours}h ${remMinutes}m`;
}

export default function RateLimitBanner({ resetAt }: RateLimitBannerProps) {
  const resetDate = useMemo(() => toResetDate(resetAt), [resetAt]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const remaining = resetDate.getTime() - now;

  return (
    <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-200">
      <p className="font-medium">GitHub API rate limit reached.</p>
      <p className="mt-1 text-amber-100/90">
        Try again in <span className="font-semibold">{formatRemaining(remaining)}</span>
        {" "}(resets at {resetDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}).
      </p>
    </div>
  );
}
