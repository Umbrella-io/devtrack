import { describe, it, expect } from 'vitest';
import { toDateStr, dateDiffDays, getThisWeekRange, getLastWeekRange } from '../src/lib/dateUtils';

describe('toDateStr', () => {
  it('returns ISO date string without time', () => {
    const date = new Date('2024-06-15T12:30:00Z');
    expect(toDateStr(date)).toBe('2024-06-15');
  });

  it('handles date with midnight time', () => {
    const date = new Date('2024-01-01T00:00:00Z');
    expect(toDateStr(date)).toBe('2024-01-01');
  });

  it('handles end of day time', () => {
    const date = new Date('2024-12-31T23:59:59.999Z');
    expect(toDateStr(date)).toBe('2024-12-31');
  });
});

describe('dateDiffDays', () => {
  it('returns positive difference when b is after a', () => {
    expect(dateDiffDays('2026-05-01', '2026-05-10')).toBe(9);
  });

  it('returns negative difference when b is before a', () => {
    expect(dateDiffDays('2026-05-10', '2026-05-01')).toBe(-9);
  });

  it('returns 0 for same day', () => {
    expect(dateDiffDays('2026-05-24', '2026-05-24')).toBe(0);
  });

  it('handles year boundary crossing', () => {
    expect(dateDiffDays('2025-12-31', '2026-01-01')).toBe(1);
  });
});

describe('getThisWeekRange', () => {
  it('returns object with start and end properties', () => {
    const range = getThisWeekRange();
    expect(range).toHaveProperty('start');
    expect(range).toHaveProperty('end');
  });

  it('start is before end', () => {
    const range = getThisWeekRange();
    expect(new Date(range.start).getTime()).toBeLessThan(new Date(range.end).getTime());
  });

  it('start is at midnight UTC', () => {
    const range = getThisWeekRange();
    const start = new Date(range.start);
    expect(start.getUTCHours()).toBe(0);
    expect(start.getUTCMinutes()).toBe(0);
    expect(start.getUTCSeconds()).toBe(0);
  });

  it('end is at end of day UTC', () => {
    const range = getThisWeekRange();
    const end = new Date(range.end);
    expect(end.getUTCHours()).toBe(23);
    expect(end.getUTCMinutes()).toBe(59);
    expect(end.getUTCSeconds()).toBe(59);
  });
});

describe('getLastWeekRange', () => {
  it('returns object with start and end properties', () => {
    const range = getLastWeekRange();
    expect(range).toHaveProperty('start');
    expect(range).toHaveProperty('end');
  });

  it('start is before end', () => {
    const range = getLastWeekRange();
    expect(new Date(range.start).getTime()).toBeLessThan(new Date(range.end).getTime());
  });

  it('start is at midnight UTC', () => {
    const range = getLastWeekRange();
    const start = new Date(range.start);
    expect(start.getUTCHours()).toBe(0);
    expect(start.getUTCMinutes()).toBe(0);
    expect(start.getUTCSeconds()).toBe(0);
  });

  it('end is at end of day UTC', () => {
    const range = getLastWeekRange();
    const end = new Date(range.end);
    expect(end.getUTCHours()).toBe(23);
    expect(end.getUTCMinutes()).toBe(59);
    expect(end.getUTCSeconds()).toBe(59);
  });

  it('is before this week range', () => {
    const thisWeek = getThisWeekRange();
    const lastWeek = getLastWeekRange();
    expect(new Date(lastWeek.end).getTime()).toBeLessThan(new Date(thisWeek.start).getTime());
  });
});
