'use client';

import { useEffect, useRef, useState } from 'react';
import Image from "next/image";

/* ═══════════════════════════════════════════════════════════
   PUBLIC TYPES
   ═══════════════════════════════════════════════════════════ */
export type RepoStats = {
  stars: number;
  forks: number;
  openIssues: number;
  contributorCount: number;
  goodFirstIssues: number;
  contributors: Array<{ login: string; avatar_url: string; html_url: string }>;
};

/* ═══════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════ */
const A = '#818cf8';                  // accent — indigo
const BG = 'transparent'
const SURF = '#0e0e0e';
const BORDER = '#2a2a2a';             // was #1a1a1a — now more visible
const TEXT = '#e0e0e0';
const MUTED = '#94a3b8';
const HC = ['#111', '#1e1b4b', '#3730a3', '#4f46e5', A]; // heatmap levels
const MC = ['#111', '#1e1b4b', '#3730a3', A];             // mini heatmap

const MONO = 'var(--font-jetbrains, ui-monospace, monospace)';
const DISP = 'var(--font-syne, system-ui, sans-serif)';

/* ═══════════════════════════════════════════════════════════
   PRE-SEEDED DATA  (deterministic → no hydration mismatch)
   ═══════════════════════════════════════════════════════════ */
function heatLvl(i: number): 0 | 1 | 2 | 3 | 4 {
  const d = i % 7;
  const w = Math.floor(i / 7);
  if (d === 0 || d === 6) return w % 4 === 0 ? 1 : 0;
  const h = (w * 7 + d * 13 + 17) % 20;
  if (h > 16) return 4;
  if (h > 12) return 3;
  if (h > 7) return 2;
  if (h > 3) return 1;
  return 0;
}

const HEAT = Array.from({ length: 364 }, (_, i) => heatLvl(i));
const MINI = Array.from({ length: 63 }, (_, i) => ((i * 7 + 11) % 4) as 0 | 1 | 2 | 3);
const BARS = [4, 7, 6, 8, 5, 2, 1, 6, 9, 7, 5, 8, 3, 2, 7, 8, 9, 6, 4, 1, 3];

const COMMITS = [
  'feat(streak): add 7-day rolling average',
  'fix(auth): handle token refresh edge case',
  'chore(deps): bump next to 15.3.0',
  'feat(heatmap): add tooltip on cell hover',
  'refactor(api): extract contribution parser',
  'style: align PR metrics grid spacing',
  'feat(goals): auto-progress from GitHub activity',
  'fix: timezone-aware streak calculation',
  'docs: update README with setup guide',
  'feat(leaderboard): weekly ranking system',
];

/* ═══════════════════════════════════════════════════════════
   HOOKS
   ═══════════════════════════════════════════════════════════ */
function useScrollReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) { setVis(true); io.unobserve(el); }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, vis] as const;
}

function Counter({ end, active }: { end: number; active: boolean }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setVal(end);
      return;
    }

    const dur = 1500;
    const t0 = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const p = Math.min((now - t0) / dur, 1);
      setVal(Math.round((1 - (1 - p) ** 3) * end));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, end]);
  return <>{val.toLocaleString()}</>;
}

/* ═══════════════════════════════════════════════════════════
   MOUSE SPOTLIGHT
   ═══════════════════════════════════════════════════════════ */
function MouseSpotlight() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current) {
        ref.current.style.left = e.clientX + 'px';
        ref.current.style.top = e.clientY + 'px';
      }
    };
    window.addEventListener('mousemove', fn, { passive: true });
    return () => window.removeEventListener('mousemove', fn);
  }, []);
  return (
    <div
      ref={ref}
      aria-hidden
      style={{
        position: 'fixed', pointerEvents: 'none', zIndex: 0,
        width: 700, height: 700,
        background: 'radial-gradient(circle, rgba(129,140,248,0.05) 0%, transparent 70%)',
        transform: 'translate(-50%,-50%)',
        transition: 'left 0.15s ease-out, top 0.15s ease-out',
      }}
    />
  );
}

/* ═══════════════════════════════════════════════════════════
   NAV
   ═══════════════════════════════════════════════════════════ */
function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <nav
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        height: 52, padding: '0 clamp(20px,4vw,48px)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: scrolled ? 'rgba(8,8,8,0.92)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: `1px solid ${scrolled ? BORDER : 'transparent'}`,
        transition: 'all 0.3s',
      }}
    >
      <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 14, color: TEXT, letterSpacing: '-0.02em' }}>
        <span style={{ color: A }}>▲</span> DEVTRACK
      </span>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <a href="/dashboard" className="lnd-nav-link">Dashboard</a>
        <a href="/api/auth/signin/github?callbackUrl=/dashboard" className="lnd-nav-link">
          SIGN IN →
        </a>
      </div>
    </nav>
  );
}

/* ═══════════════════════════════════════════════════════════
   BENTO WIDGETS
   ═══════════════════════════════════════════════════════════ */
const wLabel: React.CSSProperties = {
  fontFamily: MONO, fontSize: 10, fontWeight: 500,
  color: '#444', textTransform: 'uppercase', letterSpacing: '0.1em',
};
const wValue: React.CSSProperties = {
  fontFamily: MONO, fontWeight: 600, color: TEXT,
};

function Cell({
  children,
  spanCols = 1,
  style = {},
}: {
  children: React.ReactNode;
  spanCols?: number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className="lnd-cell"
      style={{ gridColumn: spanCols > 1 ? `span ${spanCols}` : undefined, ...style }}
    >
      {children}
    </div>
  );
}

function ChartWidget() {
  const [ref, vis] = useScrollReveal(0);
  const [hovBar, setHovBar] = useState(-1);
  const max = 9;
  return (
    <Cell spanCols={2} style={{ display: 'flex', flexDirection: 'column', minHeight: 100 }}>
      <div ref={ref} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={wLabel}>contributions / 30d</span>
        <span style={{ ...wLabel, color: A }}>■ active</span>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 2, minHeight: 60 }}>
        {BARS.map((v, i) => (
          <div
            key={i}
            onMouseEnter={() => setHovBar(i)}
            onMouseLeave={() => setHovBar(-1)}
            style={{
              flex: 1, borderRadius: '2px 2px 0 0',
              background: hovBar === i ? '#fff' : A,
              height: vis ? `${(v / max) * 100}%` : '0%',
              opacity: hovBar === i ? 1 : 0.3 + (v / max) * 0.7,
              transition: `height 0.5s cubic-bezier(0.4,0,0.2,1) ${i * 20}ms, opacity 0.15s`,
              cursor: 'crosshair', position: 'relative',
            }}
          >
            {hovBar === i && (
              <div style={{
                position: 'absolute', bottom: '100%', left: '50%',
                transform: 'translateX(-50%)',
                background: '#fff', color: '#000', fontSize: 9,
                fontFamily: MONO, padding: '2px 4px', borderRadius: 3,
                marginBottom: 2, whiteSpace: 'nowrap', fontWeight: 600,
              }}>
                {v}
              </div>
            )}
          </div>
        ))}
      </div>
    </Cell>
  );
}

function StreakWidget() {
  const [ref, vis] = useScrollReveal(0);
  const r = 26, circ = 2 * Math.PI * r, pct = 23 / 30;
  return (
    <Cell>
      <div
        ref={ref}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 4 }}
      >
        <div style={{ position: 'relative', width: 62, height: 62 }}>
          <svg width="62" height="62" viewBox="0 0 62 62" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="31" cy="31" r={r} fill="none" stroke="#1a1a1a" strokeWidth="3" />
            <circle
              cx="31" cy="31" r={r} fill="none" stroke={A} strokeWidth="3"
              strokeDasharray={circ}
              strokeDashoffset={circ * (1 - (vis ? pct : 0))}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1) 0.3s' }}
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ ...wValue, fontSize: 20 }}>23</span>
          </div>
        </div>
        <span style={{ ...wLabel, fontSize: 9 }}>day streak</span>
      </div>
    </Cell>
  );
}

function MergeWidget() {
  const [ref, vis] = useScrollReveal(0);
  return (
    <Cell>
      <div ref={ref} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
        <span style={wLabel}>merge rate</span>
        <span style={{ ...wValue, fontSize: 26, marginTop: 4, color: A }}>
          87<span style={{ color: '#333', fontSize: 14 }}>%</span>
        </span>
        <div style={{ marginTop: 8, height: 3, borderRadius: 2, background: '#1a1a1a', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 2, background: A,
            width: vis ? '87%' : '0%',
            transition: 'width 1s cubic-bezier(0.4,0,0.2,1) 0.2s',
          }} />
        </div>
      </div>
    </Cell>
  );
}

function GoalWidget() {
  const [ref, vis] = useScrollReveal(0);
  return (
    <Cell>
      <div ref={ref} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
        <span style={wLabel}>weekly goal</span>
        <span style={{ ...wValue, fontSize: 26, marginTop: 4 }}>
          84<span style={{ color: '#333', fontSize: 14 }}>%</span>
        </span>
        <div style={{ marginTop: 8, height: 3, borderRadius: 2, background: '#1a1a1a', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 2, background: '#f59e0b',
            width: vis ? '84%' : '0%',
            transition: 'width 1s cubic-bezier(0.4,0,0.2,1) 0.3s',
          }} />
        </div>
      </div>
    </Cell>
  );
}

function HeatmapMini() {
  const [ref, vis] = useScrollReveal(0);
  return (
    <Cell>
      <div ref={ref}>
        <span style={{ ...wLabel, display: 'block', marginBottom: 8 }}>heatmap</span>
        <div style={{ display: 'grid', gridTemplateRows: 'repeat(7, 1fr)', gridAutoFlow: 'column', gap: 2 }}>
          {MINI.map((v, i) => (
            <div
              key={i}
              style={{
                width: 8, height: 8, borderRadius: 1.5,
                background: MC[v],
                opacity: vis ? 1 : 0,
                transform: vis ? 'scale(1)' : 'scale(0)',
                transition: `all 0.2s ease ${i * 4}ms`,
              }}
            />
          ))}
        </div>
      </div>
    </Cell>
  );
}

function BentoGrid() {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 5, width: '100%', maxWidth: 380,
    }}>
      <ChartWidget />
      <StreakWidget />
      <MergeWidget />
      <GoalWidget />
      <HeatmapMini />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   HERO
   ═══════════════════════════════════════════════════════════ */
function HeroSection() {
  return (
    <section
      style={{
        minHeight: '100vh',
        display: 'flex', alignItems: 'center',
        padding: '80px clamp(24px,5vw,64px) 40px',
        gap: 'clamp(32px,5vw,80px)',
        flexWrap: 'wrap', justifyContent: 'center',
        position: 'relative', zIndex: 1,
        overflow: 'hidden',
      }}
    >
      {/* Ambient Animated Background Glow */}
      <div 
        style={{
          position: 'absolute',
          top: '20%', left: '10%',
          width: '60vw', height: '60vw',
          background: 'radial-gradient(circle, rgba(129,140,248,0.15) 0%, transparent 60%)',
          borderRadius: '50%',
          filter: 'blur(60px)',
          animation: 'floatGlow 10s ease-in-out infinite alternate',
          pointerEvents: 'none',
          zIndex: -1,
        }}
      />
      <div 
        style={{
          position: 'absolute',
          bottom: '-10%', right: '5%',
          width: '50vw', height: '50vw',
          background: 'radial-gradient(circle, rgba(55,48,163,0.2) 0%, transparent 60%)',
          borderRadius: '50%',
          filter: 'blur(80px)',
          animation: 'floatGlow2 12s ease-in-out infinite alternate',
          pointerEvents: 'none',
          zIndex: -1,
        }}
      />
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes floatGlow {
          0% { transform: translate(0px, 0px) scale(1); opacity: 0.5; }
          100% { transform: translate(30px, -50px) scale(1.1); opacity: 0.8; }
        }
        @keyframes floatGlow2 {
          0% { transform: translate(0px, 0px) scale(1); opacity: 0.5; }
          100% { transform: translate(-40px, 40px) scale(1.2); opacity: 0.9; }
        }
      `}} />

      {/* Left: text */}
      <div style={{ flex: '1 1 340px', maxWidth: 500, position: 'relative', zIndex: 2 }}>
        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(129,140,248,0.1)', border: '1px solid rgba(129,140,248,0.25)',
          borderRadius: 24, padding: '6px 14px', marginBottom: 28,
          boxShadow: '0 4px 14px rgba(129,140,248,0.1)',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 8px #10b981' }} />
          <span style={{ fontFamily: MONO, fontSize: 11, color: A, letterSpacing: '0.08em', fontWeight: 600 }}>
            OPEN SOURCE · FREE FOREVER
          </span>
        </div>

        {/* Headline */}
        <h1
          style={{
            fontFamily: DISP, fontWeight: 800,
            fontSize: 'clamp(40px,6.5vw,82px)', lineHeight: 0.95,
            letterSpacing: '-0.04em', color: TEXT, margin: '0 0 24px',
            animation: 'lndHeroIn 0.8s cubic-bezier(0.16,1,0.3,1) 0.1s both',
            textShadow: '0 4px 24px rgba(0,0,0,0.4)',
          }}
        >
          YOUR<br />CODE<br />HAS A<br />
          <span style={{ color: A, textShadow: '0 0 30px rgba(129,140,248,0.3)' }}>PULSE</span>
          <span style={{ color: '#222' }}>.</span>
        </h1>

        {/* Tagline — NOW HIGH CONTRAST */}
        <p style={{
          fontSize: 'clamp(16px,2vw,18px)', color: MUTED,
          lineHeight: 1.6, maxWidth: 420, margin: '0 0 36px',
          fontWeight: 400,
        }}>
          Open-source developer productivity dashboard. Track GitHub streaks,
          PR velocity, and coding goals — automatically.
        </p>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <a href="/api/auth/signin/github?callbackUrl=/dashboard" className="lnd-cta-primary" style={{
            boxShadow: '0 8px 24px rgba(129,140,248,0.3)',
            transition: 'transform 0.3s, box-shadow 0.3s',
            transform: 'translateY(0)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 12px 28px rgba(129,140,248,0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(129,140,248,0.3)';
          }}>
            <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            Sign in with GitHub
          </a>
          <a
            href="https://github.com/Priyanshu-byte-coder/devtrack"
            target="_blank"
            rel="noopener noreferrer"
            className="lnd-cta-secondary"
            style={{
              transition: 'transform 0.3s, background 0.3s',
              transform: 'translateY(0)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            ★ Star on GitHub
          </a>
        </div>
      </div>

      {/* Right: bento */}
      <div style={{ flex: '1 1 340px', display: 'flex', justifyContent: 'center', position: 'relative', zIndex: 2 }}>
        <BentoGrid />
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   COMMIT TICKER
   ═══════════════════════════════════════════════════════════ */
function CommitTicker() {
  const doubled = [...COMMITS, ...COMMITS];
  return (
    <div style={{
      borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`,
      padding: '10px 0', overflow: 'hidden', background: BG,
    }}>
      <div className="lnd-ticker" style={{ display: 'flex', gap: 48, whiteSpace: 'nowrap' }}>
        {doubled.map((c, i) => (
          <span
            key={i}
            style={{
              fontFamily: MONO, fontSize: 12, color: '#333',
              display: 'inline-flex', alignItems: 'center', gap: 10,
            }}
          >
            <span style={{ color: A, fontSize: 8 }}>●</span>
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   HEATMAP SECTION
   ═══════════════════════════════════════════════════════════ */
function HeatmapSection() {
  const [ref, vis] = useScrollReveal(0.05);
  return (
    <section ref={ref} style={{ padding: '64px clamp(20px,4vw,48px)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
        <span style={{ fontFamily: MONO, fontSize: 11, color: '#333', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          52 weeks of contributions
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontFamily: MONO, fontSize: 10, color: '#333' }}>less</span>
          {HC.map((c, i) => (
            <div key={i} style={{ width: 10, height: 10, borderRadius: 2, background: c, border: `1px solid ${BORDER}` }} />
          ))}
          <span style={{ fontFamily: MONO, fontSize: 10, color: '#333' }}>more</span>
        </div>
      </div>
      <div style={{
        display: 'grid', gridTemplateRows: 'repeat(7, 13px)',
        gridAutoFlow: 'column', gap: 3,
        overflowX: 'auto', paddingBottom: 8,
      }}>
        {HEAT.map((v, i) => (
          <div
            key={i}
            className="lnd-heatmap-cell"
            style={{
              width: 13, height: 13, borderRadius: 2,
              background: HC[v],
              opacity: vis ? 1 : 0,
              transform: vis ? 'scale(1)' : 'scale(0)',
              transition: `all 0.2s ease ${Math.floor(i / 7) * 12}ms`,
            }}
          />
        ))}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   STATS ROW
   ═══════════════════════════════════════════════════════════ */
const STATS = [
  { value: 847, label: 'COMMITS TRACKED' },
  { value: 43,  label: 'PRS MERGED' },
  { value: 89,  label: 'DAY BEST STREAK' },
  { value: 67,  label: 'REVIEWS GIVEN' },
];

function StatItem({ value, label, delay }: { value: number; label: string; delay: number }) {
  const [ref, vis] = useScrollReveal(0.2);
  return (
    <div
      ref={ref}
      style={{
        opacity: vis ? 1 : 0,
        transform: vis ? 'translateY(0)' : 'translateY(16px)',
        transition: `all 0.5s ease ${delay}ms`,
      }}
    >
      <div style={{
        fontFamily: MONO, fontWeight: 700,
        fontSize: 'clamp(32px,5vw,52px)', color: TEXT,
        lineHeight: 1, letterSpacing: '-0.03em',
      }}>
        <Counter end={value} active={vis} />
        <span style={{ color: '#222', fontSize: 'clamp(18px,3vw,28px)' }}>+</span>
      </div>
      <div style={{ fontFamily: MONO, fontSize: 10, color: '#333', letterSpacing: '0.12em', marginTop: 8 }}>
        {label}
      </div>
    </div>
  );
}

function StatsSection() {
  return (
    <section id="features" style={{
      padding: '64px clamp(20px,4vw,48px)',
      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))',
        gap: 24, borderTop: '1px solid #1e293b',
    }}>
      {STATS.map((s, i) => (
        <StatItem key={s.label} value={s.value} label={s.label} delay={i * 80} />
      ))}
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   FEATURES LIST
   ═══════════════════════════════════════════════════════════ */
const FEATURES = [
  {
    num: '01', title: 'STREAK TRACKING',
    desc: 'Current streak, longest streak, active coding days. Tracked automatically from your GitHub. Never break the chain.',
  },
  {
    num: '02', title: 'PR ANALYTICS',
    desc: 'Review velocity, merge rates, open and closed counts. Understand your pull request lifecycle at a glance.',
  },
  {
    num: '03', title: 'WEEKLY GOALS',
    desc: 'Set commit and PR targets. Progress bars auto-update from your GitHub activity. Stay accountable.',
  },
  {
    num: '04', title: 'CONTRIBUTION HEATMAP',
    desc: 'Full-year visualization of your coding consistency. See patterns emerge across weeks and months.',
  },
  {
    num: '05', title: 'LANGUAGE BREAKDOWN',
    desc: 'See which languages dominate your contributions. TypeScript, Python, Go — tracked across all repos.',
  },
  {
    num: '06', title: 'PUBLIC PROFILE',
    desc: 'Share your developer stats with the world. Your coding story, visible to anyone.',
  },
];

function FeatureItem({ f, index }: { f: typeof FEATURES[0]; index: number }) {
  const [ref, vis] = useScrollReveal(0.15);
  return (
    <div
      ref={ref}
      style={{
        display: 'flex', gap: 'clamp(16px,3vw,32px)',
        padding: '24px 0', borderBottom: '1px solid #1e293b',
        opacity: vis ? 1 : 0,
        transform: vis ? 'translateX(0)' : 'translateX(-12px)',
        transition: `all 0.5s ease ${index * 50}ms`,
      }}
    >
      <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 600, color: A, minWidth: 28, paddingTop: 3 }}>
        {f.num}
      </span>
      <div>
        <h3 style={{
          fontFamily: DISP, fontWeight: 700,
          fontSize: 'clamp(16px,2.5vw,22px)', color: TEXT,
          letterSpacing: '-0.02em', margin: '0 0 6px',
        }}>
          {f.title}
        </h3>
        <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.65, margin: 0 }}>   {/* was '#444' */}
          {f.desc}
        </p>
      </div>
    </div>
  );
}

function FeaturesSection() {
  return (
    <section style={{
      padding: '64px clamp(20px,4vw,48px) 80px',
      borderTop: '1px solid #1e293b',
      maxWidth: 720, margin: '0 auto',
    }}>
      <div style={{ fontFamily: MONO, fontSize: 10, color: A, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 40 }}>
        FEATURES
      </div>
      {FEATURES.map((f, i) => (
        <FeatureItem key={f.num} f={f} index={i} />
      ))}
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   SETUP SECTION
   ═══════════════════════════════════════════════════════════ */
function SetupSection() {
  const [ref, vis] = useScrollReveal(0.2);
  return (
    <section
      id="open-source"
      ref={ref}
      style={{
        padding: '80px clamp(20px,4vw,48px)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
        opacity: vis ? 1 : 0,
        transform: vis ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 0.7s ease',
      }}
    >
      <div style={{ fontFamily: MONO, fontSize: 10, color: A, letterSpacing: '0.12em', marginBottom: 24 }}>
        SETUP
      </div>

      <div style={{
        background: '#0a0a0c', border: `1px solid #1e293b`,
        borderRadius: 8, padding: '24px 28px', maxWidth: 480, width: '100%',
        textAlign: 'left', marginBottom: 32,
        fontFamily: MONO, fontSize: 13, lineHeight: 1.8,
        boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
      }}>
        {/* Terminal Header Mock */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }} />
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }} />
        </div>
        <div style={{ color: '#10b981', fontWeight: 500 }}># start tracking in 30 seconds</div>
        <div style={{ color: TEXT }}>
          <span style={{ color: A }}>→</span> sign in at{' '}
          <span style={{ color: A }}>devtrack.vercel.app</span>
        </div>
        <div style={{ color: '#10b981', marginTop: 8, fontWeight: 500 }}># or self-host</div>
        <div style={{ color: TEXT }}>
          <span style={{ color: A }}>$</span> git clone github.com/…/devtrack
        </div>
        <div style={{ color: TEXT }}>
          <span style={{ color: A }}>$</span> npm install && npm run dev
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <a href="/api/auth/signin/github?callbackUrl=/dashboard" className="lnd-cta-primary">
          Sign in with GitHub
        </a>
        <a
          href="https://github.com/Priyanshu-byte-coder/devtrack"
          target="_blank"
          rel="noopener noreferrer"
          className="lnd-cta-secondary"
        >
          ★ Star on GitHub
        </a>
      </div>

      <div style={{ fontFamily: MONO, fontSize: 11, color: '#222', marginTop: 20, letterSpacing: '0.06em' }}>
        MIT License · Self-hostable · Free forever · Zero vendor lock-in
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   OPEN SOURCE / CONTRIBUTE SECTION
   ═══════════════════════════════════════════════════════════ */
function ContributeSection({ stats }: { stats: RepoStats }) {
  const [ref, vis] = useScrollReveal(0.08);

  const statTiles = [
    { icon: '★', value: stats.stars,          suffix: '',  label: 'GITHUB STARS' },
    { icon: '⑂', value: stats.forks,          suffix: '',  label: 'FORKS' },
    { icon: '◎', value: stats.contributorCount, suffix: '+', label: 'CONTRIBUTORS' },
    { icon: '◈', value: stats.goodFirstIssues, suffix: '',  label: 'GOOD FIRST ISSUES' },
  ];

  return (
    <section
      ref={ref}
      style={{
        padding: '80px clamp(20px,4vw,48px)',
        borderTop: '1px solid #1e293b',
        opacity: vis ? 1 : 0,
        transform: vis ? 'translateY(0)' : 'translateY(24px)',
        transition: 'all 0.7s ease',
      }}
    >
      {/* Label */}
      <div style={{ fontFamily: MONO, fontSize: 10, color: A, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 40 }}>
        OPEN SOURCE
      </div>

      {/* Stat tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: 12, marginBottom: 56 }}>
        {statTiles.map(s => (
          <div
            key={s.label}
            style={{
              background: '#0a0a0c', border: `1px solid #1e293b`,
              borderRadius: 8, padding: '20px 20px 16px',
            }}
          >
            <div style={{ fontFamily: MONO, fontSize: 10, color: '#94a3b8', letterSpacing: '0.1em', marginBottom: 10 }}>
              {s.icon} {s.label}
            </div>
            <div style={{
              fontFamily: MONO, fontWeight: 700,
              fontSize: 'clamp(26px,3.5vw,42px)', color: TEXT,
              lineHeight: 1, letterSpacing: '-0.03em',
            }}>
              <Counter end={s.value} active={vis} />
              {s.suffix && <span style={{ color: A, fontSize: '0.75em' }}>{s.suffix}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Headline + tagline */}
      <div style={{ maxWidth: 680, marginBottom: 40 }}>
        <h2 style={{
          fontFamily: DISP, fontWeight: 800,
          fontSize: 'clamp(28px,4vw,52px)', color: TEXT,
          letterSpacing: '-0.03em', lineHeight: 1.05,
          margin: '0 0 16px',
        }}>
          BUILT IN PUBLIC.<br />
          <span style={{ color: A }}>SHIP WITH US.</span>
        </h2>
        <p style={{ fontSize: 16, color: MUTED, lineHeight: 1.7, margin: 0 }}>   {/* was '#555' */}
          DevTrack is fully open source — MIT licensed, self-hostable, and built by developers
          who actually use it. Every widget, every metric, every API was contributed by
          someone in this list. {stats.goodFirstIssues > 0 && (
            <span style={{ color: TEXT }}>
              {stats.goodFirstIssues} issues are tagged good&nbsp;first&nbsp;issue and waiting right now.
            </span>
          )}
        </p>
      </div>

      {/* Contributor avatars */}
      {stats.contributors.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', marginBottom: 40, gap: 0 }}>
          {stats.contributors.map((c, i) => (
            <a
              key={c.login}
              href={c.html_url}
              target="_blank"
              rel="noopener noreferrer"
              title={`@${c.login}`}
              style={{
                width: 38, height: 38, borderRadius: '50%',
                border: `2px solid ${BG}`,
                marginLeft: i > 0 ? -11 : 0,
                overflow: 'hidden', display: 'block',
                position: 'relative', zIndex: stats.contributors.length - i,
                transition: 'transform 0.15s, z-index 0s',
                flexShrink: 0,
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.transform = 'translateY(-5px) scale(1.15)';
                el.style.zIndex = '99';
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.transform = 'translateY(0) scale(1)';
                el.style.zIndex = String(stats.contributors.length - i);
              }}
            >
              <Image
                src={c.avatar_url}
                alt={c.login}
                width={38}
                height={38}
                loading="lazy"
                style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </a>
          ))}
          {stats.contributorCount > stats.contributors.length && (
            <div style={{
              width: 38, height: 38, borderRadius: '50%',
              border: `2px solid #000000`,
              background: '#1e293b', marginLeft: -11,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: MONO, fontSize: 10, color: '#cbd5e1', flexShrink: 0,
            }}>
              +{stats.contributorCount - stats.contributors.length}
            </div>
          )}
        </div>
      )}

      {/* CTA row */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <a
          href="https://github.com/Priyanshu-byte-coder/devtrack/issues?q=label%3A%22good+first+issue%22+is%3Aopen"
          target="_blank"
          rel="noopener noreferrer"
          className="lnd-cta-primary"
        >
          ◈ Browse Good First Issues
        </a>
        <a
          href="https://github.com/Priyanshu-byte-coder/devtrack/blob/main/CONTRIBUTING.md"
          target="_blank"
          rel="noopener noreferrer"
          className="lnd-cta-secondary"
        >
          CONTRIBUTING.md
        </a>
        <a
          href="https://github.com/Priyanshu-byte-coder/devtrack/fork"
          target="_blank"
          rel="noopener noreferrer"
          className="lnd-cta-secondary"
        >
          ⑂ Fork Repository
        </a>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   LANDING FOOTER  (above global Footer)
   ═══════════════════════════════════════════════════════════ */
function LandingFooter() {
  return (
    <footer 
      data-testid="landing-footer"
      style={{
        borderTop: `1px solid ${BORDER}`,   // was '#111'
        padding: '24px clamp(20px,4vw,48px)',
        display: 'flex', flexWrap: 'wrap', gap: '8px 32px',
        justifyContent: 'space-between', alignItems: 'center',
      }}
    >
      <span style={{ fontFamily: MONO, fontSize: 11, color: '#222' }}>
        © {new Date().getFullYear()} DEVTRACK
      </span>
      <div style={{ display: 'flex', gap: 20 }}>
        {[
          { label: 'GitHub', href: 'https://github.com/Priyanshu-byte-coder/devtrack' },
          { label: 'Docs', href: 'https://github.com/Priyanshu-byte-coder/devtrack/blob/main/DEVELOPMENT.md' },
          { label: 'Issues', href: 'https://github.com/Priyanshu-byte-coder/devtrack/issues' },
        ].map(l => (
          <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className="lnd-footer-link">
            {l.label}
          </a>
        ))}
      </div>
    </footer>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN EXPORT
   ═══════════════════════════════════════════════════════════ */
export default function LandingPage({ repoStats }: { repoStats: RepoStats }) {
  return (
    <div
      className="lnd-root"
      style={{ background: BG, color: TEXT, minHeight: '100vh', position: 'relative', overflowX: 'hidden' }}
    >
      <MouseSpotlight />
      <HeroSection />
      <CommitTicker />
      <HeatmapSection />
      <StatsSection />
      <FeaturesSection />
      <ContributeSection stats={repoStats} />
      <SetupSection />
      <LandingFooter />
    </div>
  );
}
