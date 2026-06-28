import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import {
  CopyToClipboardError,
  copyTextToClipboard,
} from "@/lib/copy-to-clipboard";

describe("copyTextToClipboard", () => {
  beforeEach(() => {
    Object.defineProperty(window.navigator, "clipboard", {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("writes text with the clipboard API", async () => {
    const writeText = vi.spyOn(window.navigator.clipboard, "writeText");

    await copyTextToClipboard("hello world");

    expect(writeText).toHaveBeenCalledWith("hello world");
  });

  it("falls back to execCommand when clipboard API fails", async () => {
    vi.spyOn(window.navigator.clipboard, "writeText").mockRejectedValue(
      new Error("blocked"),
    );

    const execCommand = vi.fn().mockReturnValue(true);
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: execCommand,
    });

    await copyTextToClipboard("fallback text");

    expect(execCommand).toHaveBeenCalledWith("copy");
  });

  it("throws CopyToClipboardError when fallback copy fails", async () => {
    vi.spyOn(window.navigator.clipboard, "writeText").mockRejectedValue(
      new Error("blocked"),
    );
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: vi.fn().mockReturnValue(false),
    });

    await expect(copyTextToClipboard("fail")).rejects.toBeInstanceOf(
      CopyToClipboardError,
    );
  });
});

describe("useCopyToClipboard", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(window.navigator, "clipboard", {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      configurable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("marks copied true after a successful copy", async () => {
    const { result } = renderHook(() => useCopyToClipboard({ resetDelay: 2500 }));

    await act(async () => {
      await result.current.copy("profile link");
    });

    expect(result.current.copied).toBe(true);
  });

  it("resets copied state after resetDelay", async () => {
    const { result } = renderHook(() => useCopyToClipboard({ resetDelay: 2500 }));

    await act(async () => {
      await result.current.copy("profile link");
    });

    act(() => {
      vi.advanceTimersByTime(2500);
    });

    expect(result.current.copied).toBe(false);
  });

  it("tracks copiedId when an id is provided", async () => {
    const { result } = renderHook(() => useCopyToClipboard());

    await act(async () => {
      await result.current.copy("goal link", "goal-1");
    });

    expect(result.current.isCopied("goal-1")).toBe(true);
    expect(result.current.isCopied("goal-2")).toBe(false);
  });
});
