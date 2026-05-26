"use client";

import { useEffect, useRef, useState } from "react";

export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Disable on touch devices
    if (window.matchMedia("(pointer: coarse)").matches) return;

    // Respect reduced motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Hide default cursor
    document.documentElement.style.cursor = "none";

    let mouseX = 0;
    let mouseY = 0;
    let ringX = 0;
    let ringY = 0;
    let animationId: number;

    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      setIsVisible(true);

      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${mouseX}px, ${mouseY}px)`;
      }
    };

    const onMouseLeave = () => setIsVisible(false);
    const onMouseEnter = () => setIsVisible(true);

    const onMouseDown = () => setIsClicking(true);
    const onMouseUp = () => setIsClicking(false);

    // Ring follows with lerp (lag effect)
    const animateRing = () => {
      ringX += (mouseX - ringX) * 0.12;
      ringY += (mouseY - ringY) * 0.12;

      if (ringRef.current) {
        ringRef.current.style.transform = `translate(${ringX}px, ${ringY}px)`;
      }

      animationId = requestAnimationFrame(animateRing);
    };

    // Detect hoverable elements
    const onMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isHoverable = target.closest(
        "a, button, [role='button'], input, textarea, select, label, [tabindex]"
      );
      setIsHovering(!!isHoverable);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseleave", onMouseLeave);
    document.addEventListener("mouseenter", onMouseEnter);
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("mouseover", onMouseOver);

    animationId = requestAnimationFrame(animateRing);

    return () => {
      document.documentElement.style.cursor = "";
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseleave", onMouseLeave);
      document.removeEventListener("mouseenter", onMouseEnter);
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("mouseover", onMouseOver);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <>
      {/* Dot */}
      <div
        ref={dotRef}
        aria-hidden="true"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: isHovering ? "8px" : "6px",
          height: isHovering ? "8px" : "6px",
          borderRadius: "50%",
          backgroundColor: "#818cf8",
          boxShadow: "0 0 8px 2px rgba(129, 140, 248, 0.8)",
          pointerEvents: "none",
          zIndex: 99999,
          marginLeft: isHovering ? "-4px" : "-3px",
          marginTop: isHovering ? "-4px" : "-3px",
          transition: "width 0.2s, height 0.2s, background-color 0.2s",
          opacity: isVisible ? 1 : 0,
          willChange: "transform",
        }}
      />

      {/* Ring */}
      <div
        ref={ringRef}
        aria-hidden="true"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: isClicking ? "28px" : isHovering ? "44px" : "36px",
          height: isClicking ? "28px" : isHovering ? "44px" : "36px",
          borderRadius: "50%",
          border: `1.5px solid rgba(129, 140, 248, ${isHovering ? "0.9" : "0.5"})`,
          backgroundColor: isHovering
            ? "rgba(129, 140, 248, 0.1)"
            : "transparent",
          boxShadow: isHovering
            ? "0 0 12px 2px rgba(129, 140, 248, 0.2)"
            : "none",
          pointerEvents: "none",
          zIndex: 99998,
          marginLeft: isClicking ? "-14px" : isHovering ? "-22px" : "-18px",
          marginTop: isClicking ? "-14px" : isHovering ? "-22px" : "-18px",
          transition:
            "width 0.3s ease, height 0.3s ease, margin 0.3s ease, background-color 0.3s ease, border-color 0.3s ease",
          opacity: isVisible ? 1 : 0,
          willChange: "transform",
        }}
      />
    </>
  );
}