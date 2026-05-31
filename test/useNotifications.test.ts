// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useNotifications } from "../src/hooks/useNotifications";

describe("useNotifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("should fetch notifications successfully", async () => {
    const mockData = {
      notifications: [
        {
          id: "1",
          type: "streak" as const,
          title: "7-day streak!",
          message: "You've maintained a 7-day streak!",
          read: false,
          createdAt: "2025-05-24T10:00:00Z",
        },
      ],
      unreadCount: 1,
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBeNull();
  });

  it("should handle fetch errors", async () => {
    (global.fetch as any).mockImplementation(() =>
      Promise.reject(new Error("Network error"))
    );

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it("should mark notification as read", async () => {
    const mockData = {
      notifications: [
        {
          id: "1",
          type: "streak" as const,
          title: "Test",
          message: "Test message",
          read: false,
          createdAt: "2025-05-24T10:00:00Z",
        },
      ],
      unreadCount: 1,
    };

    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await result.current.markAsRead("1");

    await waitFor(() => {
      expect(result.current.data?.notifications[0].read).toBe(true);
    });

    expect(result.current.data?.unreadCount).toBe(0);
  });

  it("should refetch notifications", async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          notifications: [],
          unreadCount: 0,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          notifications: [
            {
              id: "2",
              type: "milestone" as const,
              title: "New milestone",
              message: "You reached 100 commits!",
              read: false,
              createdAt: "2025-05-24T11:00:00Z",
            },
          ],
          unreadCount: 1,
        }),
      });

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await result.current.refetch();

    await waitFor(() => {
      expect(result.current.data?.notifications.length).toBe(1);
    });
  });

  it("should call onError callback on error", async () => {
    const onError = vi.fn();

    (global.fetch as any).mockImplementation(() =>
      Promise.reject(new Error("Test error"))
    );

    renderHook(() => useNotifications({ onError }));

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});