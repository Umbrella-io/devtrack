// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useStreak } from "../src/hooks/useStreak";

describe("useStreak", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("should fetch streak and contributions data successfully", async () => {
    const mockStreakData = {
      current: 15,
      longest: 30,
      lastCommitDate: "2025-05-24",
      totalActiveDays: 45,
      freezeDates: [],
    };

    const mockContributionData = {
      days: 365,
      total: 250,
      data: { "2025-05-24": 5, "2025-05-23": 3 },
    };

    const mockFreezeData = {
      hasFreeze: false,
    };

    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockStreakData,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockContributionData,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockFreezeData,
      });

    const { result } = renderHook(() => useStreak());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.streak).toEqual(mockStreakData);
    expect(result.current.contributions).toEqual(mockContributionData);
    expect(result.current.freeze).toEqual(mockFreezeData);
    expect(result.current.error).toBeNull();
  });

  it("should handle fetch errors", async () => {
    (global.fetch as any).mockImplementation(() =>
      Promise.reject(new Error("Network error"))
    );

    const { result } = renderHook(() => useStreak());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.streak).toBeNull();
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it("should include accountId in URL when provided", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    renderHook(() => useStreak("github-user-123"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    const firstCall = (global.fetch as any).mock.calls[0][0];
    expect(firstCall).toContain("accountId=github-user-123");
  });

  it("should refetch streak data when refetch is called", async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          current: 15,
          longest: 30,
          lastCommitDate: "2025-05-24",
          totalActiveDays: 45,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ days: 365, total: 250, data: {} }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ hasFreeze: false }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          current: 20,
          longest: 30,
          lastCommitDate: "2025-05-24",
          totalActiveDays: 45,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ days: 365, total: 300, data: {} }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ hasFreeze: false }),
      });

    const { result } = renderHook(() => useStreak());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await result.current.refetch();

    await waitFor(() => {
      expect(result.current.streak?.current).toBe(20);
    });
  });

  it("should refetch freeze data independently", async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          current: 10,
          longest: 20,
          lastCommitDate: null,
          totalActiveDays: 30,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ days: 365, total: 200, data: {} }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ hasFreeze: false }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          hasFreeze: true,
          freezeDate: "2025-05-25",
        }),
      });

    const { result } = renderHook(() => useStreak());

    await waitFor(() => {
      expect(result.current.freezeLoading).toBe(false);
    });

    await result.current.refetchFreeze();

    await waitFor(() => {
      expect(result.current.freeze?.hasFreeze).toBe(true);
    });
  });

  it("should call onError callback on error", async () => {
  const onError = vi.fn();

  (global.fetch as any).mockImplementation(() =>
    Promise.reject(new Error("Test error"))
  );

  renderHook(() => useStreak(undefined, { onError }));

  await waitFor(() => {
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });
});
});