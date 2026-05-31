// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useMetrics } from "../src/hooks/useMetrics";

describe("useMetrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("should fetch data successfully", async () => {
    const mockData = { issues: 5, closed: 3 };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    const { result } = renderHook(() => useMetrics("/api/metrics/issues"));

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

    const { result } = renderHook(() => useMetrics("/api/metrics/issues"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it("should handle API error responses", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      statusText: "Not Found",
    });

    const { result } = renderHook(() => useMetrics("/api/metrics/invalid"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it("should refetch data when refetch is called", async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ value: 42 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ value: 100 }),
      });

    const { result } = renderHook(() => useMetrics("/api/metrics/test"));

    await waitFor(() => {
      expect(result.current.data).toEqual({ value: 42 });
    });

    await result.current.refetch();

    await waitFor(() => {
      expect(result.current.data).toEqual({ value: 100 });
    });
  });

 it("should call onError callback on error", async () => {
  const onError = vi.fn();

  (global.fetch as any).mockImplementation(() =>
    Promise.reject(new Error("Test error"))
  );

  renderHook(() => useMetrics("/api/metrics/test", { onError }));

  await waitFor(() => {
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });
});
});