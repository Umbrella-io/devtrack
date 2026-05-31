// @vitest-environment jsdom
"use client";

import { useCallback, useEffect, useState } from "react";

export interface Notification {
  id: string;
  type: "streak" | "milestone" | "goal" | "system";
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}

export interface NotificationsData {
  notifications: Notification[];
  unreadCount: number;
}

export interface UseNotificationsReturn {
  data: NotificationsData | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
  markAsRead: (id: string) => Promise<void>;
}

/**
 * Custom hook for fetching and managing user notifications.
 * Handles loading, error states, and provides refetch and mark-as-read capabilities.
 * 
 * @param options - Configuration options
 * @returns Object containing notifications data and state management functions
 */
export function useNotifications(
  options?: {
    onError?: (error: Error) => void;
  }
): UseNotificationsReturn {
  const [data, setData] = useState<NotificationsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(() => {
    setLoading(true);
    setError(null);

    fetch("/api/notifications")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`API error: ${response.statusText}`);
        }
        return response.json();
      })
      .then((result: NotificationsData) => {
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
  }, [options]);

  const markAsRead = useCallback(
    async (id: string) => {
      try {
        const response = await fetch(`/api/notifications/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ read: true }),
        });

        if (!response.ok) {
          throw new Error("Failed to mark notification as read");
        }

        // Update local state
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            notifications: prev.notifications.map((n) =>
              n.id === id ? { ...n, read: true } : n
            ),
            unreadCount: Math.max(0, prev.unreadCount - 1),
          };
        });
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        options?.onError?.(error);
      }
    },
    [options]
  );

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch, markAsRead };
}
