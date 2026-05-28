"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  baseAlpha: number;
  color: string;
  hue: number;
  burst: boolean;
  life: number;
}

interface ShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  length: number;
  alpha: number;
  life: number;
}

export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion) return;

    let animationId: number;
    let particles: Particle[] = [];
    let shootingStars: ShootingStar[] = [];
    let mouse = { x: -9999, y: -9999 };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    const handleMouseLeave = () => {
      mouse.x = -9999;
      mouse.y = -9999;
    };
    const handleClick = (e: MouseEvent) => {
      const cx = e.clientX;
      const cy = e.clientY;
      for (let i = 0; i < 30; i++) {
        const angle = (Math.PI * 2 * i) / 30;
        const speed = Math.random() * 4 + 1;
        particles.push({
          x: cx, y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: Math.random() * 2.5 + 0.5,
          alpha: 1, baseAlpha: 1, life: 1,
          color: `hsl(${Math.random() * 60 + 240}, 100%, 70%)`,
          hue: Math.random() * 60 + 240,
          burst: true,
        });
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("click", handleClick);

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const createParticle = (): Particle => {
      const hue = Math.random() * 60 + 220;
      const baseAlpha = Math.random() * 0.6 + 0.15;
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: Math.random() * 2 + 0.5,
        alpha: baseAlpha, baseAlpha,
        color: `hsl(${hue}, 80%, 68%)`,
        hue, burst: false, life: 1,
      };
    };

    const createShootingStar = (): ShootingStar => ({
      x: Math.random() * canvas.width * 0.7,
      y: Math.random() * canvas.height * 0.4,
      vx: Math.random() * 8 + 4,
      vy: Math.random() * 4 + 2,
      length: Math.random() * 80 + 60,
      alpha: 1, life: 1,
    });

    const init = () => {
      resize();
      const count = Math.min(
        Math.floor((canvas.width * canvas.height) / 10000),
        100
      );
      particles = Array.from({ length: count }, createParticle);
    };

    const animate = () => {
      ctx.fillStyle = "rgba(10,10,26,0.18)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Shooting stars
      if (Math.random() < 0.008) shootingStars.push(createShootingStar());
      shootingStars = shootingStars.filter((s) => s.alpha > 0);
      shootingStars.forEach((s) => {
        s.life -= 0.018;
        s.alpha = s.life;
        s.x += s.vx;
        s.y += s.vy;
        const tailX = s.x - s.length * 0.7;
        const tailY = s.y - s.length * 0.35;
        const grad = ctx.createLinearGradient(s.x, s.y, tailX, tailY);
        grad.addColorStop(0, `rgba(255,255,255,${s.alpha})`);
        grad.addColorStop(0.3, `rgba(180,160,255,${s.alpha * 0.6})`);
        grad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(tailX, tailY);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      // Connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 110) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(140,120,255,${(1 - dist / 110) * 0.15})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // Particles
      particles = particles.filter((p) => !p.burst || p.life > 0);
      particles.forEach((p) => {
        if (p.burst) {
          p.life -= 0.025;
          p.alpha = p.life;
          p.vx *= 0.96;
          p.vy *= 0.96;
        } else {
          // Attract to mouse
          const mdx = mouse.x - p.x;
          const mdy = mouse.y - p.y;
          const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
          const attractRadius = 120;
          if (mdist < attractRadius && mdist > 0) {
            const force = ((attractRadius - mdist) / attractRadius) * 0.012;
            p.vx += (mdx / mdist) * force * mdist * 0.05;
            p.vy += (mdy / mdist) * force * mdist * 0.05;
            p.alpha = Math.min(1, p.baseAlpha + (1 - mdist / attractRadius) * 0.8);
          } else {
            p.alpha += (p.baseAlpha - p.alpha) * 0.05;
          }
          // Speed limit + drift
          const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
          if (speed > 2) { p.vx = (p.vx / speed) * 2; p.vy = (p.vy / speed) * 2; }
          p.vx *= 0.99; p.vy *= 0.99;
          p.vx += (Math.random() - 0.5) * 0.02;
          p.vy += (Math.random() - 0.5) * 0.02;
          // Hue shift over time
          p.hue = (p.hue + 0.1) % 360;
          p.color = `hsl(${p.hue}, 80%, 68%)`;
        }

        p.x += p.vx;
        p.y += p.vy;

        if (!p.burst) {
          if (p.x < 0) p.x = canvas.width;
          if (p.x > canvas.width) p.x = 0;
          if (p.y < 0) p.y = canvas.height;
          if (p.y > canvas.height) p.y = 0;
        }

        // Glowing particle
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 5);
        g.addColorStop(0, `hsla(${p.hue}, 80%, 68%, ${p.alpha})`);
        g.addColorStop(0.4, `hsla(${p.hue}, 80%, 68%, ${p.alpha * 0.4})`);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 5, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
      });

      animationId = requestAnimationFrame(animate);
    };

    init();
    animate();

    const handleResize = () => init();
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("click", handleClick);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  );
}