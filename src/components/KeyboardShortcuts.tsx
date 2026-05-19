"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/components/ThemeContext";
import ShortcutsModal from "./ShortcutsModal";

export default function KeyboardShortcuts() {
  const [isOpen, setIsOpen] = useState(false);
  const { toggleTheme } = useTheme();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      if (activeElement) {
        const tagName = activeElement.tagName.toLowerCase();
        if (tagName === "input" || tagName === "textarea" || tagName === "select") return;
        if (activeElement.getAttribute("contenteditable") === "true") return;
      }

      if (e.key === "?") {
        setIsOpen(true);
        e.preventDefault();
        return;
      }

      if (e.key.toLowerCase() === "d") {
        toggleTheme();
        e.preventDefault();
        return;
      }

      if (e.key.toLowerCase() === "b") {
        window.dispatchEvent(new Event("toggleChart"));
        e.preventDefault();
        return;
      }

      if (e.key.toLowerCase() === "r") {
        window.location.reload();
        e.preventDefault();
        return;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [toggleTheme]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex h-10 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-medium text-[var(--muted-foreground)] transition-colors hover:bg-[var(--control)] hover:text-[var(--card-foreground)]"
        aria-label="Show keyboard shortcuts"
      >
        <kbd className="rounded bg-[var(--control)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--card-foreground)]">
          ?
        </kbd>
        <span>Shortcuts</span>
      </button>

      <ShortcutsModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
