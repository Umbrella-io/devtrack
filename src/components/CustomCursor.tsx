"use client";

import { useEffect, useRef, useState } from "react";

const DOT_SIZE = 8;
const RING_SIZE = 36;
const CLICK_SCALE = 0.6;
const HOVER_RING_SCALE = 1.6;

export default function CustomCursor() {
  const dotRef  = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  const mouse = useRef({ x: -100, y: -100 });
  const ring  = useRef({ x: -100, y: -100 });
  const rafId = useRef<number>(0);

  const [visible,  setVisible]  = useState(false);
  const [clicking, setClicking] = useState(false);
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return;

    document.documentElement.style.cursor = "none";

    const isInteractive = (el: Element | null): boolean => {
      if (!el) return false;
      const tag = (el as HTMLElement).tagName.toLowerCase();
      if (["a", "button", "input", "select", "textarea", "label"].includes(tag)) return true;
      if ((el as HTMLElement).getAttribute("role") === "button") return true;
      if ((el as HTMLElement).style.cursor === "pointer") return true;
      return isInteractive(el.parentElement);
    };

    const onMove = (e: MouseEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY };
      if (!visible) setVisible(true);
    };

    const onEnter = () => setVisible(true);
    const onLeave = () => setVisible(false);
    const onDown  = () => setClicking(true);
    const onUp    = () => setClicking(false);
    const onOver  = (e: MouseEvent) => setHovering(isInteractive(e.target as Element));

    document.addEventListener("mousemove",  onMove);
    document.addEventListener("mouseenter", onEnter);
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mousedown",  onDown);
    document.addEventListener("mouseup",    onUp);
    document.addEventListener("mouseover",  onOver);

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const LERP_FACTOR = 0.12;

    const tick = () => {
      ring.current.x = lerp(ring.current.x, mouse.current.x, LERP_FACTOR);
      ring.current.y = lerp(ring.current.y, mouse.current.y, LERP_FACTOR);

      if (dotRef.current) {
        dotRef.current.style.transform =
          `translate(${mouse.current.x - DOT_SIZE / 2}px, ${mouse.current.y - DOT_SIZE / 2}px)`;
      }
      if (ringRef.current) {
        ringRef.current.style.transform =
          `translate(${ring.current.x - RING_SIZE / 2}px, ${ring.current.y - RING_SIZE / 2}px)`;
      }

      rafId.current = requestAnimationFrame(tick);
    };

    rafId.current = requestAnimationFrame(tick);

    return () => {
      document.documentElement.style.cursor = "";
      document.removeEventListener("mousemove",  onMove);
      document.removeEventListener("mouseenter", onEnter);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mousedown",  onDown);
      document.removeEventListener("mouseup",    onUp);
      document.removeEventListener("mouseover",  onOver);
      cancelAnimationFrame(rafId.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const base: React.CSSProperties = {
    position:      "fixed",
    top:           0,
    left:          0,
    pointerEvents: "none",
    zIndex:        9999,
    willChange:    "transform",
  };

  const dotStyle: React.CSSProperties = {
    ...base,
    width:      clicking ? DOT_SIZE * CLICK_SCALE : DOT_SIZE,
    height:     clicking ? DOT_SIZE * CLICK_SCALE : DOT_SIZE,
    marginLeft: clicking ? (DOT_SIZE - DOT_SIZE * CLICK_SCALE) / 2 : 0,
    marginTop:  clicking ? (DOT_SIZE - DOT_SIZE * CLICK_SCALE) / 2 : 0,
    borderRadius: "50%",
    background:   "radial-gradient(circle, #a78bfa, #7c3aed)",
    boxShadow:    clicking
      ? "0 0 6px 2px #a78bfa80"
      : "0 0 12px 4px #7c3aedaa, 0 0 24px 8px #7c3aed44",
    opacity:    visible ? 1 : 0,
    transition: "opacity 0.2s ease, box-shadow 0.15s ease, width 0.1s ease, height 0.1s ease",
  };

  const ringStyle: React.CSSProperties = {
    ...base,
    width:      hovering ? RING_SIZE * HOVER_RING_SCALE : RING_SIZE,
    height:     hovering ? RING_SIZE * HOVER_RING_SCALE : RING_SIZE,
    marginLeft: hovering ? -(RING_SIZE * (HOVER_RING_SCALE - 1)) / 2 : 0,
    marginTop:  hovering ? -(RING_SIZE * (HOVER_RING_SCALE - 1)) / 2 : 0,
    borderRadius: "50%",
    border:       hovering ? "1.5px solid #a78bfa" : "1.5px solid #6d28d9aa",
    background:   hovering ? "#7c3aed18" : "transparent",
    boxShadow:    clicking && hovering
      ? "0 0 0 4px #7c3aed22, inset 0 0 12px #7c3aed18"
      : "none",
    opacity:    visible ? 1 : 0,
    transition: [
      "opacity 0.2s ease",
      "border-color 0.2s ease",
      "background 0.2s ease",
      "width 0.2s ease",
      "height 0.2s ease",
      "margin 0.2s ease",
    ].join(", "),
  };

  return (
    <>
      <style>{`
        @keyframes cursor-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.6; }
        }
        html.custom-cursor-active *:not(input):not(textarea) {
          cursor: none !important;
        }
      `}</style>
      <div ref={ringRef} style={ringStyle} aria-hidden="true" />
      <div ref={dotRef}  style={dotStyle}  aria-hidden="true" />
    </>
  );
}