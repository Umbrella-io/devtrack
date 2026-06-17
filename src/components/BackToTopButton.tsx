"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

const SCROLL_THRESHOLD = 400;

export default function BackToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  const handleScroll = useCallback(() => {
    setIsVisible(window.scrollY > SCROLL_THRESHOLD);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  if (!isVisible) return null;

  return (
    <button
      type="button"
      onClick={scrollToTop}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          scrollToTop();
        }
      }}
      aria-label="Back to top"
      className="fixed bottom-6 right-6 z-40 rounded-full bg-accent p-3 text-accent-foreground shadow-lg transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
    >
      <ArrowUp size={20} aria-hidden="true" />
    </button>
  );
}
