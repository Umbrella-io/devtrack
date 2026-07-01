"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";

export interface UseCopyToClipboardOptions {
  resetDelay?: number;
  showToast?: boolean;
  successMessage?: string;
  errorMessage?: string;
  onSuccess?: () => void;
}

export function useCopyToClipboard({
  resetDelay = 2500,
  showToast = false,
  successMessage = "Copied to clipboard!",
  errorMessage = "Failed to copy to clipboard.",
  onSuccess,
}: UseCopyToClipboardOptions = {}) {
  const [copied, setCopied] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const resetTimerRef = useRef<number | null>(null);

  const clearResetTimer = useCallback(() => {
    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
  }, []);

  useEffect(() => clearResetTimer, [clearResetTimer]);

  const resetCopiedState = useCallback(() => {
    setCopied(false);
    setCopiedId(null);
  }, []);

  const copy = useCallback(
    async (text: string, id?: string) => {
      clearResetTimer();

      try {
        await copyTextToClipboard(text);
        setCopied(true);
        setCopiedId(id ?? null);

        if (showToast) {
          toast.success(successMessage, { duration: resetDelay });
        }

        onSuccess?.();

        resetTimerRef.current = window.setTimeout(() => {
          resetCopiedState();
          resetTimerRef.current = null;
        }, resetDelay);

        return true;
      } catch {
        toast.error(errorMessage);
        resetCopiedState();
        return false;
      }
    },
    [
      clearResetTimer,
      errorMessage,
      resetCopiedState,
      resetDelay,
      showToast,
      successMessage,
      onSuccess,
    ],
  );

  const isCopied = useCallback(
    (id?: string) => {
      if (!copied) return false;
      if (id === undefined) return true;
      return copiedId === id;
    },
    [copied, copiedId],
  );

  return {
    copy,
    copied,
    copiedId,
    isCopied,
    resetCopiedState,
  };
}
