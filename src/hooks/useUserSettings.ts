// @vitest-environment jsdom
"use client";

import { useCallback, useEffect, useState } from "react";

export interface UserSettings {
  theme: "light" | "dark" | "system";
  emailNotifications: boolean;
  weeklyDigest: boolean;
  streakNotifications: boolean;
  goalReminders: boolean;
  privacyLevel: "public" | "private" | "followers";
  defaultMetricsView: "week" | "month" | "year";
  locale: string;
}

export interface UseUserSettingsReturn {
  settings: UserSettings | null;
  loading: boolean;
  error: Error | null;
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
  refetch: () => void;
}

/**
 * Custom hook for fetching and managing user settings.
 * Handles loading, error states, and provides update and refetch capabilities.
 * 
 * @param options - Configuration options
 * @returns Object containing user settings and state management functions
 */
export function useUserSettings(
  options?: {
    onError?: (error: Error) => void;
    onSuccess?: (settings: UserSettings) => void;
  }
): UseUserSettingsReturn {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(() => {
    setLoading(true);
    setError(null);

    fetch("/api/user/settings")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`API error: ${response.statusText}`);
        }
        return response.json();
      })
      .then((result: UserSettings) => {
        setSettings(result);
        setError(null);
        options?.onSuccess?.(result);
      })
      .catch((err) => {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        options?.onError?.(error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [options]);

  const updateSettings = useCallback(
    async (updates: Partial<UserSettings>) => {
      try {
        setLoading(true);
        const response = await fetch("/api/user/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          throw new Error("Failed to update settings");
        }

        const updatedSettings = (await response.json()) as UserSettings;
        setSettings(updatedSettings);
        setError(null);
        options?.onSuccess?.(updatedSettings);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        options?.onError?.(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [options]
  );

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { settings, loading, error, updateSettings, refetch };
}
