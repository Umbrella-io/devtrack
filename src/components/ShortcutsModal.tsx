"use client";

import { useEffect, useRef } from "react";

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  key: string;
  action: string;
}

const SHORTCUTS: ShortcutItem[] = [
  { key: "T", action: "Toggle theme" },
  { key: "B", action: "Toggle chart" },
  { key: "R", action: "Reload data" },
  { key: "?", action: "Show shortcuts" },
];

export default function ShortcutsModal({ isOpen, onClose}: ShortcutsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (closeBtnRef.current) {
      closeBtnRef.current.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key === "Tab") {
        if (!modalRef.current) return;

        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl transition-transform"
        onClick={(e) => e.stopPropagation()}
     >
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
          <h2 id="modal-title" className="text-lg font-semibold text-[var(--card-foreground)]">
            Keyboard Shortcuts
          </h2>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[var(--muted-foreground)] hover:bg-[var(--control)] hover:text-[var(--card-foreground)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {SHORTCUTS.map((item) => (
            <div key={item.key} className="flex items-center justify-between py-1.5 border-b border-[var(--border)]/50 last:border-0">
              <span className="text-sm text-[var(--muted-foreground)]">{item.action}</span>
              <kbd className="min-w-[28px] text-center rounded-md border border-[var(--border)] bg-[var(--control)] px-2 py-1 text-xs font-semibold text-[var(--card-foreground)] shadow-sm">
                {item.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-[var(--border)] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-[var(--control)] px-4 py-2 text-sm font-medium text-[var(--card-foreground)] hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
