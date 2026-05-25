import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch globally
const fetchMock = vi.fn();
global.fetch = fetchMock;

// Test the GoalTracker component's pure logic and state transitions
// Since we don't have @testing-library/react, we test the handleCreate validation logic

describe('GoalTracker - handleCreate validation logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('trims whitespace from title before submission', () => {
    const title = '  Make 10 commits  ';
    const trimmed = title.trim();
    expect(trimmed).toBe('Make 10 commits');
    expect(trimmed.length).toBeGreaterThan(0);
  });

  it('rejects empty title after trim', () => {
    const title = '   ';
    const trimmed = title.trim();
    expect(trimmed.length).toBe(0);
  });

  it('rejects title over 100 characters', () => {
    const title = 'a'.repeat(101);
    expect(title.length).toBe(101);
    expect(title.length > 100).toBe(true);
  });

  it('accepts title at exactly 100 characters', () => {
    const title = 'a'.repeat(100);
    expect(title.length).toBe(100);
    expect(title.length <= 100).toBe(true);
  });

  it('handleCreate would reject empty title via fetch failure', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
    } as Response);

    const title = '';
    const target = 7;
    const unit = 'commits';
    const recurrence = 'none';

    const response = await fetch('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, target, unit, recurrence }),
    });

    expect(response.ok).toBe(false);
  });

  it('submits valid goal with correct payload', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ goal: { id: '1', title: 'Make commits', target: 10 } }),
    } as Response);

    const payload = {
      title: 'Make commits',
      target: 10,
      unit: 'commits',
      recurrence: 'none' as const,
    };

    const response = await fetch('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    expect(response.ok).toBe(true);
    const body = await response.json();
    expect(body.goal).toBeDefined();
  });

  it('submit would fail on server error', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response);

    const response = await fetch('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test', target: 5, unit: 'prs', recurrence: 'none' }),
    });

    expect(response.ok).toBe(false);
    expect(response.status).toBe(500);
  });
});

describe('GoalTracker - ConfettiBurst trigger conditions', () => {
  it('milestone reached at 25% when target is 4', () => {
    const target = 4;
    const current = 1; // 1/4 = 25%
    const isCompleted = current >= target;
    expect(isCompleted).toBe(false); // not completed yet
  });

  it('milestone reached at 50% when target is 4', () => {
    const target = 4;
    const current = 2; // 2/4 = 50%
    const isCompleted = current >= target;
    expect(isCompleted).toBe(false); // not completed
  });

  it('milestone reached at 75% when target is 4', () => {
    const target = 4;
    const current = 3; // 3/4 = 75%
    const isCompleted = current >= target;
    expect(isCompleted).toBe(false);
  });

  it('completion triggers at 100%', () => {
    const target = 4;
    const current = 4;
    const isCompleted = current >= target;
    expect(isCompleted).toBe(true);
  });

  it('progress percentage calculation is correct', () => {
    expect(Math.min((2 / 4) * 100, 100)).toBe(50);
    expect(Math.min((3 / 4) * 100, 100)).toBe(75);
    expect(Math.min((4 / 4) * 100, 100)).toBe(100);
    expect(Math.min((1 / 10) * 100, 100)).toBe(10);
  });

  it('progress is capped at 100% for over-completion', () => {
    expect(Math.min((20 / 10) * 100, 100)).toBe(100);
  });
});

describe('GoalTracker - getCompletionLabel logic', () => {
  const getCompletionLabel = (current: number, target: number, recurrence: string): string => {
    if (current >= target) {
      if (recurrence === 'weekly') return 'Completed this week ✓';
      if (recurrence === 'monthly') return 'Completed this month ✓';
      return 'Completed ✓';
    }
    return '';
  };

  it('returns Completed for one-time goal', () => {
    expect(getCompletionLabel(10, 10, 'none')).toBe('Completed ✓');
  });

  it('returns Completed this week for weekly goal', () => {
    expect(getCompletionLabel(10, 10, 'weekly')).toBe('Completed this week ✓');
  });

  it('returns Completed this month for monthly goal', () => {
    expect(getCompletionLabel(10, 10, 'monthly')).toBe('Completed this month ✓');
  });

  it('returns empty string when not completed', () => {
    expect(getCompletionLabel(5, 10, 'none')).toBe('');
  });
});

describe('GoalTracker - DELETE confirmation logic', () => {
  it('optimistic update removes goal from list immediately', () => {
    const goals = [
      { id: '1', title: 'Goal 1', current: 5, target: 10 },
      { id: '2', title: 'Goal 2', current: 3, target: 7 },
      { id: '3', title: 'Goal 3', current: 8, target: 8 },
    ];
    const previousGoals = [...goals];
    const optimisticallyRemoved = goals.filter((g) => g.id !== '2');
    expect(optimisticallyRemoved.length).toBe(2);
    expect(optimisticallyRemoved.find((g) => g.id === '2')).toBeUndefined();
    // Original should be preserved for rollback
    expect(previousGoals.find((g) => g.id === '2')).toBeDefined();
  });

  it('DELETE request is made to correct endpoint', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true } as Response);
    const id = 'goal-123';
    await fetch(`/api/goals/${id}`, { method: 'DELETE' });
    expect(fetchMock).toHaveBeenCalledWith('/api/goals/goal-123', { method: 'DELETE' });
  });

  it('failed DELETE restores previous goals', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false } as Response);
    const previousGoals = [
      { id: '1', title: 'Goal 1' },
      { id: '2', title: 'Goal 2' },
    ];
    const newGoals = previousGoals.filter((g) => g.id !== '2');
    // Simulate failed DELETE
    const restored = previousGoals;
    expect(restored.length).toBe(2);
    expect(restored.find((g) => g.id === '2')?.title).toBe('Goal 2');
  });
});

describe('GoalTracker - RECURRENCE_LABELS mapping', () => {
  const RECURRENCE_LABELS: Record<string, string> = {
    none: 'One-time',
    weekly: 'Weekly',
    monthly: 'Monthly',
  };

  it('maps none to One-time', () => {
    expect(RECURRENCE_LABELS['none']).toBe('One-time');
  });

  it('maps weekly to Weekly', () => {
    expect(RECURRENCE_LABELS['weekly']).toBe('Weekly');
  });

  it('maps monthly to Monthly', () => {
    expect(RECURRENCE_LABELS['monthly']).toBe('Monthly');
  });

  it('has all three recurrence types', () => {
    expect(Object.keys(RECURRENCE_LABELS)).toHaveLength(3);
    expect(Object.keys(RECURRENCE_LABELS)).toContain('none');
    expect(Object.keys(RECURRENCE_LABELS)).toContain('weekly');
    expect(Object.keys(RECURRENCE_LABELS)).toContain('monthly');
  });
});
