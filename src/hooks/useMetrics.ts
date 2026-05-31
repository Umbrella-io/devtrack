// @vitest-environment jsdom
"use client";

import { useCallback, useEffect, useState } from "react";

export interface UseMetricsReturn<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Generic hook for fetching metrics data from API endpoints.
 * Handles loading, error states, and provides refetch capability.
 * 
 * @template T - The type of data returned by the API
 * @param url - The API endpoint URL to fetch from
 * @param options - Configuration options for the fetch request
 * @returns Object containing data, loading, error states and refetch function
 */
export function useMetrics<T>(
  url: string,
  options?: {
    onError?: (error: Error) => void;
    retryCount?: number;
  }
): UseMetricsReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const refetch = useCallback(() => {
    setLoading(true);
    setError(null);

    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`API error: ${response.statusText}`);
        }
        return response.json();
      })
      .then((result: T) => {
        setData(result);
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
  }, [url, options]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}
