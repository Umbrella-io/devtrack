"use client";

import { useEffect, useRef, useState } from "react";

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  key: string;
  action: string;
}

const SHORTCUTS: ShortcutItem[] = [
  { key: "Alt + T", action: "Toggle theme" },
  { key: "B", action: "Toggle chart" },
  { key: "R", action: "Reload data" },
  { key: "G + D", action: "Go to Dashboard" },
  { key: "G + P", action: "Go to Goals" },
  { key: "Esc", action: "Close modal/dialog" },
  { key: "?", action: "Show shortcuts" },
];
export default function ShortcutsModal({
  isOpen,
  onClose,
}: ShortcutsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && typeof navigator !== "undefined") {
      setIsMac(/Mac|iPod|iPhone|iPad/.test(navigator.userAgent));
    }
  }, []);

   useEffect(() => {
    if (!isOpen) return;

     closeBtnRef.current?.focus();

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
       if (
        modalRef.current &&
        !modalRef.current.contains(e.target as Node)
       ) {
         onClose();
       }
    };

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

        if (e.shiftKey && document.activeElement === firstElement) {
         lastElement.focus();
         e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          firstElement.focus();
           e.preventDefault();
         }
       }
     };

     document.addEventListener("keydown", handleKeyDown);
     document.addEventListener("mousedown", handleClickOutside);
     document.addEventListener("touchstart", handleClickOutside);
    return () => {
       document.removeEventListener("keydown", handleKeyDown);
       document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
   }, [isOpen, onClose]);
  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-labelledby="shortcuts-title"
      className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-xl"
    >
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <h2
          id="shortcuts-title"
          className="text-sm font-semibold text-[var(--card-foreground)]"
        >
          Keyboard Shortcuts
        </h2>
        <button
          ref={closeBtnRef}
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--control)] hover:text-[var(--card-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          aria-label="Close shortcuts"
        >
          x
        </button>
      </div>

      <div className="px-4 py-3">
        {SHORTCUTS.map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between border-b border-[var(--border)]/50 py-2 last:border-0"
          >
            <span className="text-sm text-[var(--muted-foreground)]">
              {item.action}
            </span>
            <kbd className="min-w-[28px] rounded-md border border-[var(--border)] bg-[var(--control)] px-2 py-1 text-center text-xs font-semibold text-[var(--card-foreground)] shadow-sm">
              {item.key === "T" ? (isMac ? "Option + T" : "Alt + T") : item.key}
            </kbd>
          </div>
        ))}
      </div>

      <div className="flex justify-end border-t border-[var(--border)] px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-[var(--control)] px-4 py-2 text-sm font-medium text-[var(--card-foreground)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
