"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

export default function BackToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  // Explicit handler to monitor window scroll depth thresholds
  const toggleVisibility = () => {
    if (typeof window !== "undefined") {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    }
  };

  // Programmatic execution to smoothly glide viewport back to the top anchor
  const scrollToTop = () => {
    if (typeof window !== "undefined") {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };

  // Lifecycle hook managing the global viewport scroll listener matrix cleanly
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.addEventListener("scroll", toggleVisibility);
      
      return () => {
        window.removeEventListener("scroll", toggleVisibility);
      };
    }
  }, []);

  // Compute animation tracking classes separately to maintain layout spacing
  const visibilityClass = isVisible 
    ? "opacity-100 scale-100" 
    : "opacity-0 scale-0 pointer-events-none";

  return (
    <button
      onClick={scrollToTop}
      type="button"
      aria-label="Scroll up to top of profile page"
      className={`fixed bottom-8 right-8 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-foreground)] shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--background)] ${visibilityClass}`}
    >
      <ArrowUp size={24} aria-hidden="true" />
    </button>
  );
}