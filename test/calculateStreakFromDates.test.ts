import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

function dateDiffDays(a: string, b: string): number {
  return (
    (new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24)
  );
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function calculateStreakFromDates(
  activeDates: Set<string>,
  freezeDates: Set<string>
): {
  current: number;
  longest: number;
  lastCommitDate: string | null;
  totalActiveDays: number;
  freezeDates: string[];
} {
  const combinedDates = new Set<string>([
    ...Array.from(activeDates),
    ...Array.from(freezeDates),
  ]);
  const commitDays = Array.from(combinedDates).sort();

  if (commitDays.length === 0) {
    return {
      current: 0,
      longest: 0,
      lastCommitDate: null,
      totalActiveDays: 0,
      freezeDates: Array.from(freezeDates),
    };
  }

  let longestStreak = 1;
  let currentRun = 1;
  const runs: { start: string; end: string; length: number }[] = [];
  let runStart = commitDays[0];

  for (let i = 1; i < commitDays.length; i++) {
    const diff = dateDiffDays(commitDays[i - 1], commitDays[i]);
    if (diff === 1) {
      currentRun++;
      if (currentRun > longestStreak) {
        longestStreak = currentRun;
      }
    } else {
      runs.push({ start: runStart, end: commitDays[i - 1], length: currentRun });
      runStart = commitDays[i];
      currentRun = 1;
    }
  }
  runs.push({
    start: runStart,
    end: commitDays[commitDays.length - 1],
    length: currentRun,
  });

  const lastDay = commitDays[commitDays.length - 1];
  const today = toDateStr(new Date());
  const yesterday = toDateStr(new Date(Date.now() - 86400000));

  const lastRun = runs[runs.length - 1];
  const currentStreak =
    lastRun.end === today || lastRun.end === yesterday ? lastRun.length : 0;

  return {
    current: currentStreak,
    longest: longestStreak,
    lastCommitDate: lastDay,
    totalActiveDays: commitDays.length,
    freezeDates: Array.from(freezeDates),
  };
}

describe('calculateStreakFromDates', () => {
  const realDate = Date;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-23'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calculateStreak: returns 0 for empty array strings', () => {
    const result = calculateStreakFromDates(new Set(), new Set());
    expect(result.current).toBe(0);
    expect(result.longest).toBe(0);
    expect(result.totalActiveDays).toBe(0);
    expect(result.lastCommitDate).toBeNull();
  });

  it('calculateStreak: returns 1 for single contribution today date', () => {
    const result = calculateStreakFromDates(new Set(['2026-05-23']), new Set());
    expect(result.current).toBe(1);
    expect(result.longest).toBe(1);
    expect(result.totalActiveDays).toBe(1);
    expect(result.lastCommitDate).toBe('2026-05-23');
  });

  it('calculateStreak: returns 1 for single contribution yesterday date', () => {
    const result = calculateStreakFromDates(new Set(['2026-05-22']), new Set());
    expect(result.current).toBe(1);
    expect(result.longest).toBe(1);
  });

  it('calculateStreak: returns 0 when last contribution older than yesterday', () => {
    const result = calculateStreakFromDates(new Set(['2026-05-20']), new Set());
    expect(result.current).toBe(0);
    expect(result.longest).toBe(1);
  });

  it('calculateStreak: computes longest milestone streak range correctly', () => {
    const activeDates = new Set([
      '2026-05-01',
      '2026-05-02',
      '2026-05-03',
      '2026-05-10',
      '2026-05-11',
      '2026-05-12',
      '2026-05-13',
    ]);
    const result = calculateStreakFromDates(activeDates, new Set());
    expect(result.longest).toBe(4);
  });

  it('calculateStreak: respects freeze dates in combined evaluation map', () => {
    const activeDates = new Set(['2026-05-01', '2026-05-02', '2026-05-04']);
    const freezeDates = new Set(['2026-05-03']);
    const result = calculateStreakFromDates(activeDates, freezeDates);
    expect(result.longest).toBe(4);
    expect(result.current).toBe(0);
    expect(result.freezeDates).toContain('2026-05-03');
  });

  it('calculateStreak: counts total active days properly across gaps', () => {
    const activeDates = new Set([
      '2026-05-01',
      '2026-05-02',
      '2026-05-03',
      '2026-05-05',
    ]);
    const freezeDates = new Set(['2026-05-04']);
    const result = calculateStreakFromDates(activeDates, freezeDates);
    expect(result.totalActiveDays).toBe(5);
  });

  it('calculateStreak: handles empty active dates with valid freeze dates', () => {
    const freezeDates = new Set(['2026-05-01', '2026-05-02']);
    const result = calculateStreakFromDates(new Set(), freezeDates);
    expect(result.current).toBe(0);
    expect(result.longest).toBe(2);
    expect(result.totalActiveDays).toBe(2);
  });

  it('calculateStreak: returns ongoing streak starting today date', () => {
    const activeDates = new Set(['2026-05-21', '2026-05-22', '2026-05-23']);
    const result = calculateStreakFromDates(activeDates, new Set());
    expect(result.current).toBe(3);
  });

  it('calculateStreak: handles intermediate structural gaps in dates array', () => {
    const activeDates = new Set(['2026-05-01', '2026-05-05', '2026-05-06']);
    const result = calculateStreakFromDates(activeDates, new Set());
    expect(result.longest).toBe(2);
    expect(result.totalActiveDays).toBe(3);
  });
});
