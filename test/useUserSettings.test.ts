// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useUserSettings } from "../src/hooks/useUserSettings";

describe("useUserSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  const mockSettings = {
    theme: "light" as const,
    emailNotifications: true,
    weeklyDigest: false,
    streakNotifications: true,
    goalReminders: true,
    privacyLevel: "public" as const,
    defaultMetricsView: "week" as const,
    locale: "en-US",
  };

  it("should fetch user settings successfully", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockSettings,
    });

    const { result } = renderHook(() => useUserSettings());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.settings).toEqual(mockSettings);
    expect(result.current.error).toBeNull();
  });

  it("should handle fetch errors", async () => {
    (global.fetch as any).mockImplementation(() =>
      Promise.reject(new Error("Network error"))
    );

    const { result } = renderHook(() => useUserSettings());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.settings).toBeNull();
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it("should update user settings", async () => {
    const updatedSettings = {
      ...mockSettings,
      theme: "dark" as const,
    };

    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSettings,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => updatedSettings,
      });

    const { result } = renderHook(() => useUserSettings());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await result.current.updateSettings({ theme: "dark" });

    await waitFor(() => {
      expect(result.current.settings?.theme).toBe("dark");
    });
  });

  it("should handle update errors", async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSettings,
      })
      .mockResolvedValueOnce({
        ok: false,
        statusText: "Internal Server Error",
      });

    const { result } = renderHook(() => useUserSettings());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await result.current.updateSettings({ theme: "dark" }).catch(() => null);

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(Error);
    });
  });

  it("should call onSuccess callback on fetch", async () => {
    const onSuccess = vi.fn();

    (global.fetch as any).mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => mockSettings,
      })
    );

    renderHook(() => useUserSettings({ onSuccess }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(mockSettings);
    });
  });

  it("should call onError callback on error", async () => {
    const onError = vi.fn();

    (global.fetch as any).mockImplementation(() =>
      Promise.reject(new Error("Test error"))
    );

    renderHook(() => useUserSettings({ onError }));

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  it("should refetch settings", async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSettings,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockSettings,
          theme: "dark" as const,
        }),
      });

    const { result } = renderHook(() => useUserSettings());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await result.current.refetch();

    await waitFor(() => {
      expect(result.current.settings?.theme).toBe("dark");
    });
  });
});