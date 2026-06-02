'use client';

import { useRef, useEffect, useState } from 'react';

const FEATURES = [
  {
    icon: '🔥',
    title: 'Commit Streak Tracker',
    description: 'Never break your streak. Track daily commits and get notified before you lose momentum.',
    color: '#f97316',
  },
  {
    icon: '📊',
    title: 'PR Analytics',
    description: 'Deep insights into your pull request patterns — merge rates, review times, and trends.',
    color: '#6366f1',
  },
  {
    icon: '🎯',
    title: 'Goal Tracker',
    description: 'Set weekly coding goals and track your progress with visual milestones.',
    color: '#10b981',
  },
  {
    icon: '🏆',
    title: 'Leaderboard',
    description: 'Compare your GitHub activity with friends and the community.',
    color: '#f59e0b',
  },
  {
    icon: '🤖',
    title: 'AI Mentor Widget',
    description: 'Get personalized insights and suggestions powered by AI to improve your coding habits.',
    color: '#8b5cf6',
  },
  {
    icon: '📈',
    title: 'Contribution Heatmap',
    description: 'Visualize your coding activity over time with a beautiful contribution heatmap.',
    color: '#06b6d4',
  },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Connect GitHub',
    description: 'Sign in with your GitHub account in one click — no setup required.',
    icon: '🔗',
  },
  {
    step: '02',
    title: 'View Your Metrics',
    description: 'Instantly see your commits, PRs, streaks, and activity heatmap.',
    icon: '📊',
  },
  {
    step: '03',
    title: 'Set Goals & Grow',
    description: 'Set coding goals, track progress, and level up your developer journey.',
    icon: '🚀',
  },
];

function useScrollReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVis(true); io.disconnect(); } },
      { threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, vis] as const;
}

function FeatureCard({ feature, index }: { feature: typeof FEATURES[0]; index: number }) {
  const [ref, vis] = useScrollReveal();
  return (
    <div
      ref={ref}
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px',
        padding: '28px 24px',
        transition: `opacity 0.6s ease ${index * 0.1}s, transform 0.6s ease ${index * 0.1}s`,
        opacity: vis ? 1 : 0,
        transform: vis ? 'translateY(0)' : 'translateY(24px)',
      }}
    >
      <div style={{
        width: '48px',
        height: '48px',
        borderRadius: '12px',
        background: `${feature.color}22`,
        border: `1px solid ${feature.color}44`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '24px',
        marginBottom: '16px',
      }}>
        {feature.icon}
      </div>
      <h3 style={{
        fontSize: '1rem',
        fontWeight: 600,
        color: '#f1f5f9',
        marginBottom: '8px',
        fontFamily: 'var(--font-syne)',
      }}>
        {feature.title}
      </h3>
      <p style={{
        fontSize: '0.875rem',
        color: '#94a3b8',
        lineHeight: 1.6,
        margin: 0,
      }}>
        {feature.description}
      </p>
    </div>
  );
}

function HowItWorksStep({ step, index }: { step: typeof HOW_IT_WORKS[0]; index: number }) {
  const [ref, vis] = useScrollReveal();
  return (
    <div
      ref={ref}
      style={{
        textAlign: 'center',
        transition: `opacity 0.6s ease ${index * 0.15}s, transform 0.6s ease ${index * 0.15}s`,
        opacity: vis ? 1 : 0,
        transform: vis ? 'translateY(0)' : 'translateY(24px)',
      }}
    >
      <div style={{
        width: '64px',
        height: '64px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '28px',
        margin: '0 auto 16px',
        boxShadow: '0 0 24px rgba(99,102,241,0.3)',
      }}>
        {step.icon}
      </div>
      <div style={{
        fontSize: '0.75rem',
        fontWeight: 700,
        color: '#6366f1',
        letterSpacing: '0.1em',
        marginBottom: '8px',
        fontFamily: 'var(--font-jetbrains)',
      }}>
        STEP {step.step}
      </div>
      <h3 style={{
        fontSize: '1.1rem',
        fontWeight: 700,
        color: '#f1f5f9',
        marginBottom: '8px',
        fontFamily: 'var(--font-syne)',
      }}>
        {step.title}
      </h3>
      <p style={{
        fontSize: '0.875rem',
        color: '#94a3b8',
        lineHeight: 1.6,
        maxWidth: '240px',
        margin: '0 auto',
      }}>
        {step.description}
      </p>
    </div>
  );
}

export function FeatureShowcaseSection() {
  const [titleRef, titleVis] = useScrollReveal();

  return (
    <section style={{
      padding: '80px clamp(20px, 4vw, 48px)',
      maxWidth: '1200px',
      margin: '0 auto',
    }}>
      {/* Section header */}
      <div
        ref={titleRef}
        style={{
          textAlign: 'center',
          marginBottom: '56px',
          transition: 'opacity 0.6s ease, transform 0.6s ease',
          opacity: titleVis ? 1 : 0,
          transform: titleVis ? 'translateY(0)' : 'translateY(24px)',
        }}
      >
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(99,102,241,0.1)',
          border: '1px solid rgba(99,102,241,0.3)',
          borderRadius: '999px',
          padding: '6px 16px',
          marginBottom: '20px',
        }}>
          <span style={{ fontSize: '0.75rem', color: '#818cf8', fontWeight: 600, letterSpacing: '0.05em' }}>
            EVERYTHING YOU NEED
          </span>
        </div>
        <h2 style={{
          fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
          fontWeight: 800,
          color: '#f1f5f9',
          fontFamily: 'var(--font-syne)',
          marginBottom: '16px',
          lineHeight: 1.2,
        }}>
          Built for Developers Who Care About Growth
        </h2>
        <p style={{
          fontSize: '1rem',
          color: '#94a3b8',
          maxWidth: '560px',
          margin: '0 auto',
          lineHeight: 1.7,
        }}>
          DevTrack gives you the metrics that matter most — all in one place, beautifully visualized.
        </p>
      </div>

      {/* Feature grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px',
        marginBottom: '96px',
      }}>
        {FEATURES.map((feature, i) => (
          <FeatureCard key={feature.title} feature={feature} index={i} />
        ))}
      </div>

      {/* How it works */}
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(16,185,129,0.1)',
          border: '1px solid rgba(16,185,129,0.3)',
          borderRadius: '999px',
          padding: '6px 16px',
          marginBottom: '20px',
        }}>
          <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 600, letterSpacing: '0.05em' }}>
            HOW IT WORKS
          </span>
        </div>
        <h2 style={{
          fontSize: 'clamp(1.75rem, 4vw, 2.25rem)',
          fontWeight: 800,
          color: '#f1f5f9',
          fontFamily: 'var(--font-syne)',
          marginBottom: '16px',
        }}>
          Up and running in 3 simple steps
        </h2>
        <p style={{
          fontSize: '1rem',
          color: '#94a3b8',
          maxWidth: '480px',
          margin: '0 auto',
          lineHeight: 1.7,
        }}>
          No complicated setup. Just connect your GitHub and start tracking instantly.
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '40px',
        maxWidth: '800px',
        margin: '0 auto',
      }}>
        {HOW_IT_WORKS.map((step, i) => (
          <HowItWorksStep key={step.step} step={step} index={i} />
        ))}
      </div>
    </section>
  );
}