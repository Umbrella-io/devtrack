"use client";

import { useEffect, useState, useRef } from "react";
import { useTheme } from "@/components/ThemeContext";
import ShortcutsModal from "./ShortcutsModal";

export default function GlobalKeyboardShortcuts() {
  const [isOpen, setIsOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const { theme, toggleTheme } = useTheme();
  const keyboardToggleRef = useRef(false);

  useEffect(() => {
    if (keyboardToggleRef.current && theme !== undefined) {
      setAnnouncement(theme === "dark" ? "Dark mode enabled" : "Light mode enabled");
    }
    keyboardToggleRef.current = false;
  }, [theme]);

  useEffect(() => {
    const handleOpenShortcuts = () => {
      setIsOpen(true);
    };

    window.addEventListener("openShortcuts", handleOpenShortcuts);
    return () => {
      window.removeEventListener("openShortcuts", handleOpenShortcuts);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      if (activeElement) {
        const tagName = activeElement.tagName.toLowerCase();
        if (tagName === "input" || tagName === "textarea" || tagName === "select") return;
        if (activeElement.getAttribute("contenteditable") === "true") return;
      }

      // Show shortcuts modal
      if (e.key === "?") {
        setIsOpen(true);
        e.preventDefault();
        return;
      }

      // Alt+T / Option+T to toggle theme
      if (e.altKey && e.key.toLowerCase() === "t") {
        keyboardToggleRef.current = true;
        toggleTheme();
        e.preventDefault();
        return;
      }

      // Toggle chart
      if (e.key.toLowerCase() === "b") {
        window.dispatchEvent(new Event("toggleChart"));
        e.preventDefault();
        return;
      }

      // Reload page
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
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>

      <ShortcutsModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
