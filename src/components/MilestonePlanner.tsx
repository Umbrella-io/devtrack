'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Target,
  Plus,
  Trash2,
  Copy,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface Milestone {
  id: string;
  title: string;
  description: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  targetDate: string;
  createdAt: string;
  category: 'commits' | 'streak' | 'projects' | 'custom';
}

type MilestoneStatus = 'completed' | 'on-track' | 'at-risk' | 'behind';

const CATEGORY_OPTIONS = [
  { value: 'commits', label: 'Commits', icon: '📝' },
  { value: 'streak', label: 'Streak Days', icon: '🔥' },
  { value: 'projects', label: 'Projects', icon: '🚀' },
  { value: 'custom', label: 'Custom', icon: '🎯' },
];

const STORAGE_KEY = 'devtrack:milestones';

function loadMilestones(): Milestone[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveMilestones(milestones: Milestone[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(milestones));
}

function getStatus(milestone: Milestone): MilestoneStatus {
  const progress = milestone.currentValue / milestone.targetValue;
  if (progress >= 1) return 'completed';

  const now = Date.now();
  const created = new Date(milestone.createdAt).getTime();
  const target = new Date(milestone.targetDate).getTime();
  const totalDuration = target - created;
  const elapsed = now - created;
  const expectedProgress = totalDuration > 0 ? elapsed / totalDuration : 0;

  if (now > target) return 'behind';
  if (progress >= expectedProgress * 0.9) return 'on-track';
  if (progress >= expectedProgress * 0.6) return 'at-risk';
  return 'behind';
}

function getForecastDate(milestone: Milestone): string | null {
  const { currentValue, targetValue, createdAt } = milestone;
  if (currentValue <= 0) return null;

  const elapsed = Date.now() - new Date(createdAt).getTime();
  const rate = currentValue / elapsed; // units per ms
  const remaining = targetValue - currentValue;
  if (rate <= 0) return null;

  const msNeeded = remaining / rate;
  const forecastDate = new Date(Date.now() + msNeeded);
  return forecastDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function StatusBadge({ status }: { status: MilestoneStatus }) {
  const config = {
    completed: { label: 'Completed', color: '#10b981', icon: <CheckCircle2 size={12} /> },
    'on-track': { label: 'On Track', color: '#6366f1', icon: <TrendingUp size={12} /> },
    'at-risk': { label: 'At Risk', color: '#f59e0b', icon: <AlertTriangle size={12} /> },
    behind: { label: 'Behind', color: '#ef4444', icon: <Clock size={12} /> },
  }[status];

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '2px 8px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 600,
      background: `${config.color}20`, color: config.color, border: `1px solid ${config.color}40`,
    }}>
      {config.icon} {config.label}
    </span>
  );
}

export default function MilestonePlanner() {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '', description: '', targetValue: '', currentValue: '0',
    unit: '', targetDate: '', category: 'custom' as Milestone['category'],
  });

  useEffect(() => {
    setMilestones(loadMilestones());
  }, []);

  const handleAdd = useCallback(() => {
    if (!form.title || !form.targetValue || !form.targetDate) return;
    const newMilestone: Milestone = {
      id: `${Date.now()}`,
      title: form.title,
      description: form.description,
      targetValue: Number(form.targetValue),
      currentValue: Number(form.currentValue) || 0,
      unit: form.unit || CATEGORY_OPTIONS.find(c => c.value === form.category)?.label || 'units',
      targetDate: form.targetDate,
      createdAt: new Date().toISOString(),
      category: form.category,
    };
    const updated = [...milestones, newMilestone];
    setMilestones(updated);
    saveMilestones(updated);
    setForm({ title: '', description: '', targetValue: '', currentValue: '0', unit: '', targetDate: '', category: 'custom' });
    setShowForm(false);
  }, [form, milestones]);

  const handleIncrement = useCallback((id: string) => {
    const updated = milestones.map(m =>
      m.id === id ? { ...m, currentValue: Math.min(m.currentValue + 1, m.targetValue) } : m
    );
    setMilestones(updated);
    saveMilestones(updated);
  }, [milestones]);

  const handleDelete = useCallback((id: string) => {
    const updated = milestones.filter(m => m.id !== id);
    setMilestones(updated);
    saveMilestones(updated);
  }, [milestones]);
  const handleDuplicate = useCallback((id: string) => {
  const milestone = milestones.find(m => m.id === id);

  if (!milestone) return;

  const duplicate: Milestone = {
    ...milestone,
    id: `${Date.now()}`,
    title: `${milestone.title} (Copy)`,
    createdAt: new Date().toISOString(),
  };

  const updated = [...milestones, duplicate];

  setMilestones(updated);
  saveMilestones(updated);
}, [milestones]);

  const statusCounts = milestones.reduce((acc, m) => {
    acc[getStatus(m)] = (acc[getStatus(m)] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Target size={20} style={{ color: '#6366f1' }} />
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--foreground)', margin: 0 }}>
            Milestone Planner
          </h2>
          {milestones.length > 0 && (
            <span style={{ fontSize: '0.75rem', background: '#6366f120', color: '#6366f1', padding: '2px 8px', borderRadius: '999px', fontWeight: 600 }}>
              {milestones.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '6px 14px', borderRadius: '8px', border: 'none',
            background: '#6366f1', color: '#fff', fontSize: '0.8rem',
            fontWeight: 600, cursor: 'pointer',
          }}
        >
          <Plus size={14} /> Add Milestone
        </button>
      </div>

      {/* Summary chips */}
      {milestones.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
          {Object.entries(statusCounts).map(([status, count]) => (
            <StatusBadge key={status} status={status as MilestoneStatus} />
          ))}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', display: 'block', marginBottom: '4px' }}>Title *</label>
              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Reach 500 commits"
                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.875rem', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', display: 'block', marginBottom: '4px' }}>Category</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value as Milestone['category'] }))}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.875rem' }}
              >
                {CATEGORY_OPTIONS.map(c => (
                  <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', display: 'block', marginBottom: '4px' }}>Target Date *</label>
              <input
                type="date"
                value={form.targetDate}
                onChange={e => setForm(f => ({ ...f, targetDate: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.875rem' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', display: 'block', marginBottom: '4px' }}>Target Value *</label>
              <input
                type="number"
                value={form.targetValue}
                onChange={e => setForm(f => ({ ...f, targetValue: e.target.value }))}
                placeholder="100"
                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.875rem' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', display: 'block', marginBottom: '4px' }}>Current Value</label>
              <input
                type="number"
                value={form.currentValue}
                onChange={e => setForm(f => ({ ...f, currentValue: e.target.value }))}
                placeholder="0"
                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.875rem' }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button onClick={() => setShowForm(false)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--foreground)', fontSize: '0.8rem', cursor: 'pointer' }}>
              Cancel
            </button>
            <button onClick={handleAdd} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#6366f1', color: '#fff', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
              Add Milestone
            </button>
          </div>
        </div>
      )}

      {/* Milestone list */}
      {milestones.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
          <Target size={32} style={{ opacity: 0.3, margin: '0 auto 8px' }} />
          <p style={{ margin: 0 }}>No milestones yet. Create one to start tracking!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {milestones.map(m => {
            const status = getStatus(m);
            const pct = Math.min(Math.round((m.currentValue / m.targetValue) * 100), 100);
            const forecast = getForecastDate(m);
            const isExpanded = expanded === m.id;
            const statusColor = { completed: '#10b981', 'on-track': '#6366f1', 'at-risk': '#f59e0b', behind: '#ef4444' }[status];

            return (
              <div key={m.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '1.1rem' }}>{CATEGORY_OPTIONS.find(c => c.value === m.category)?.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--foreground)' }}>{m.title}</span>
                      <StatusBadge status={status} />
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '2px' }}>
                      {m.currentValue}/{m.targetValue} {m.unit} · Due {new Date(m.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={() => handleIncrement(m.id)}
                      disabled={status === 'completed'}
                      style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--foreground)', fontSize: '0.75rem', cursor: status === 'completed' ? 'not-allowed' : 'pointer', opacity: status === 'completed' ? 0.4 : 1 }}
                    >
                      +1
                    </button>
                    <button onClick={() => setExpanded(isExpanded ? null : m.id)} style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted-foreground)', cursor: 'pointer' }}>
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    <button
                      onClick={() => handleDuplicate(m.id)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: '1px solid var(--border)',
                        background: 'transparent',
                        color: 'var(--foreground)',
                        cursor: 'pointer'
                      }}
                      title="Duplicate milestone"
                    >
                      <Copy size={14} />
                    </button>
                    <button onClick={() => handleDelete(m.id)} style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid transparent', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '999px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: statusColor, borderRadius: '999px', transition: 'width 0.4s ease' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)' }}>{pct}% complete</span>
                  {forecast && status !== 'completed' && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)' }}>
                      📅 Forecast: {forecast}
                    </span>
                  )}
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div style={{ marginTop: '12px', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
                    {m.description && <p style={{ margin: '0 0 6px' }}>{m.description}</p>}
                    <p style={{ margin: 0 }}>Created: {new Date(m.createdAt).toLocaleDateString()}</p>
                    {status === 'completed' && <p style={{ margin: '4px 0 0', color: '#10b981', fontWeight: 600 }}>🎉 Milestone achieved!</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}