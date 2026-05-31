// @vitest-environment jsdom
"use client";

import { useCallback, useEffect, useState } from "react";

export interface StreakData {
  current: number;
  longest: number;
  lastCommitDate: string | null;
  totalActiveDays: number;
  freezeDates?: string[];
}

export interface ContributionData {
  days: number;
  total: number;
  data: Record<string, number>;
}

export interface FreezeData {
  hasFreeze: boolean;
  freezeDate?: string | null;
}

export interface UseStreakReturn {
  streak: StreakData | null;
  contributions: ContributionData | null;
  freeze: FreezeData | null;
  loading: boolean;
  freezeLoading: boolean;
  error: Error | null;
  refetch: () => void;
  refetchFreeze: () => void;
}

/**
 * Custom hook for fetching streak data including contributions and freeze status.
 * Manages loading, error states, and provides refetch capabilities.
 * 
 * @param accountId - Optional GitHub account ID to filter by
 * @param options - Configuration options
 * @returns Object containing streak, contributions, freeze data and state management functions
 */
export function useStreak(
  accountId?: string | null,
  options?: {
    onError?: (error: Error) => void;
  }
): UseStreakReturn {
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [contributions, setContributions] = useState<ContributionData | null>(null);
  const [freeze, setFreeze] = useState<FreezeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [freezeLoading, setFreezeLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(() => {
    setLoading(true);
    setError(null);

    const streakUrl =
      accountId !== null && accountId !== undefined
        ? `/api/metrics/streak?accountId=${encodeURIComponent(accountId)}`
        : "/api/metrics/streak";
    const contributionUrl =
      accountId !== null && accountId !== undefined
        ? `/api/metrics/contributions?days=365&accountId=${encodeURIComponent(accountId)}`
        : "/api/metrics/contributions?days=365";

    Promise.all([
      fetch(streakUrl),
      fetch(contributionUrl),
    ])
      .then(([streakRes, contributionRes]) => {
        if (!streakRes.ok || !contributionRes.ok) {
          throw new Error("Failed to fetch streak data");
        }
        return Promise.all([streakRes.json(), contributionRes.json()]);
      })
      .then(([streakData, contribData]) => {
        setStreak(streakData as StreakData);
        setContributions(contribData as ContributionData);
        setError(null);
      })
      .catch((err) => {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        options?.onError?.(error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [accountId, options]);

  const refetchFreeze = useCallback(() => {
    setFreezeLoading(true);

    fetch("/api/streak/freeze")
      .then((r) => r.json())
      .then((d: FreezeData) => {
        setFreeze(d);
      })
      .catch(() => {
        setFreeze(null);
      })
      .finally(() => {
        setFreezeLoading(false);
      });
  }, []);

  useEffect(() => {
    refetch();
    refetchFreeze();
  }, [refetch, refetchFreeze]);

  return {
    streak,
    contributions,
    freeze,
    loading,
    freezeLoading,
    error,
    refetch,
    refetchFreeze,
  };
}
