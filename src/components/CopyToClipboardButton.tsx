"use client";

import { Check, Copy } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { cn } from "@/lib/utils";

export interface CopyToClipboardButtonProps
  extends Omit<ButtonProps, "onClick" | "children"> {
  value: string;
  label?: string;
  copiedLabel?: string;
  iconOnly?: boolean;
  showToast?: boolean;
  resetDelay?: number;
  successMessage?: string;
  errorMessage?: string;
  ariaLabel?: string;
  onCopied?: () => void;
}

export default function CopyToClipboardButton({
  value,
  label = "Copy",
  copiedLabel = "Copied!",
  iconOnly = false,
  showToast = false,
  resetDelay = 2500,
  successMessage,
  errorMessage,
  ariaLabel,
  onCopied,
  className,
  variant = "outline",
  size,
  disabled,
  ...buttonProps
}: CopyToClipboardButtonProps) {
  const { copy, copied } = useCopyToClipboard({
    resetDelay,
    showToast,
    successMessage,
    errorMessage,
    onSuccess: onCopied,
  });

  const resolvedSize = size ?? (iconOnly ? "icon" : "default");
  const defaultAriaLabel = ariaLabel ?? label;

  return (
    <Button
      type="button"
      variant={variant}
      size={resolvedSize}
      disabled={disabled || !value}
      aria-live="polite"
      aria-label={copied ? copiedLabel : defaultAriaLabel}
      title={copied ? copiedLabel : defaultAriaLabel}
      className={cn(
        copied && "text-[var(--success)] border-[var(--success)]/30",
        className,
      )}
      onClick={() => {
        void copy(value);
      }}
      {...buttonProps}
    >
      {copied ? (
        <>
          <Check
            className={cn(
              "h-4 w-4 shrink-0 text-[var(--success)] animate-in zoom-in-50 duration-200",
              iconOnly ? "" : "",
            )}
            aria-hidden="true"
          />
          {!iconOnly && <span>{copiedLabel}</span>}
        </>
      ) : (
        <>
          <Copy className="h-4 w-4 shrink-0" aria-hidden="true" />
          {!iconOnly && <span>{label}</span>}
        </>
      )}
    </Button>
  );
}
