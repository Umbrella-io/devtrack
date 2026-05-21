"use client";

import { useState, useEffect, useRef } from "react";

export function useCountUp(target: number, duration?: number): number {
  const [count, setCount] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) {
      setCount(target);
      return;
    }

    if (target === 0) {
      setCount(0);
      return;
    }

    if (target < 0) {
      setCount(0);
      return;
    }

    if (hasAnimated.current) {
      setCount(target);
      return;
    }

    hasAnimated.current = true;

    // Adaptive duration: smaller numbers animate slightly faster (500ms), larger numbers take up to 800ms
    const actualDuration = duration ?? (target <= 10 ? 500 : target <= 50 ? 650 : 800);

    let startTime: number | null = null;
    let animationFrameId: number;

    const animate = (currentTime: number) => {
      if (startTime === null) {
        startTime = currentTime;
      }

      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / actualDuration, 1);

      // Quintic ease-out (1 - (1 - t)^5) provides an incredibly smooth, premium, soft settling effect
      const easeOutQuint = 1 - Math.pow(1 - progress, 5);
      const currentCount = Math.round(easeOutQuint * target);

      setCount(currentCount);

      if (progress < 1) {
        animationFrame(animate);
      } else {
        setCount(target);
      }
    };

    function animationFrame(callback: FrameRequestCallback) {
      animationFrameId = requestAnimationFrame(callback);
    }

    animationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [target, duration]);

  return count;
}
