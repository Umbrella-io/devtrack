'use client';

import { useEffect, useRef } from 'react';

export default function ParticlesBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isMobile = window.innerWidth < 768;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    
    let mouseX = width / 2;
    let mouseY = height / 2;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };
    if (!isMobile) {
      window.addEventListener('mousemove', handleMouseMove);
    }

    let particles: Particle[] = [];
    const particleCount = isMobile ? 35 : 150;
    const Z_DEPTH = 1000;
    const FOV = 250;

    class Particle {
      x: number;
      y: number;
      z: number;
      vx: number;
      vy: number;
      vz: number;
      size: number;
      color: string;

      constructor() {
        this.x = (Math.random() - 0.5) * 2000;
        this.y = (Math.random() - 0.5) * 2000;
        this.z = Math.random() * Z_DEPTH;
        this.vx = (Math.random() - 0.5) * 1.5;
        this.vy = (Math.random() - 0.5) * 1.5;
        this.vz = (Math.random() - 0.5) * 2;
        this.size = Math.random() * 2 + 1;
        this.color = Math.random() > 0.5 ? 'rgba(129, 140, 248, 0.8)' : 'rgba(165, 180, 252, 0.5)';
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.z += this.vz;

        if (this.z < 1) this.z = Z_DEPTH;
        if (this.z > Z_DEPTH) this.z = 1;

        if (this.x > 1000) this.x = -1000;
        if (this.x < -1000) this.x = 1000;
        
        if (this.y > 1000) this.y = -1000;
        if (this.y < -1000) this.y = 1000;
      }

      draw() {
        const scale = FOV / (FOV + this.z);
        const x2d = this.x * scale + width / 2;
        const y2d = this.y * scale + height / 2;

        const dx = mouseX - x2d;
        const dy = mouseY - y2d;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (!isMobile && dist < 120) {
          this.x -= (dx / dist) * 1.5;
          this.y -= (dy / dist) * 1.5;
        }
        
        ctx!.beginPath();
        ctx!.arc(x2d, y2d, this.size * scale, 0, Math.PI * 2);
        ctx!.fillStyle = this.color;
        
        // Add a slight blur effect to further particles, simplify on mobile
        if (!isMobile) {
          const opacity = (1 - this.z / Z_DEPTH) * 0.8;
          ctx!.globalAlpha = opacity;
        } else {
          ctx!.globalAlpha = 0.5;
        }
        
        ctx!.fill();
        ctx!.globalAlpha = 1;
      }
    }

    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    let animationFrameId: number;
    let time = 0;

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      
      // Slight camera rotation effect
      time += 0.002;
      const camX = Math.sin(time) * 200;
      const camY = Math.cos(time) * 200;
      
      particles.forEach(p => {
        p.update();
        p.draw();
      });
      
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);
    return () => {
      if (!isMobile) {
        window.removeEventListener('mousemove', handleMouseMove);
      }
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none',
        opacity: 0.6,
      }}
    />
  );
}
