import { describe, it, expect } from 'vitest';
import { getThisWeekRange, getLastWeekRange, toDateStr } from '../src/lib/dateUtils';

describe('toDateStr', () => {
  it('returns YYYY-MM-DD format', () => {
    const date = new Date('2026-05-22T10:00:00Z');
    expect(toDateStr(date)).toBe('2026-05-22');
  });

  it('handles various dates', () => {
    expect(toDateStr(new Date('2026-01-01T00:00:00Z'))).toBe('2026-01-01');
    expect(toDateStr(new Date('2026-12-31T23:59:59Z'))).toBe('2026-12-31');
    expect(toDateStr(new Date('2026-06-15T12:30:00Z'))).toBe('2026-06-15');
  });
});

describe('getThisWeekRange', () => {
  it('returns object with start and end', () => {
    const result = getThisWeekRange();
    expect(result).toHaveProperty('start');
    expect(result).toHaveProperty('end');
  });

  it('returns valid ISO date strings', () => {
    const result = getThisWeekRange();
    expect(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(result.start)).toBe(true);
    expect(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(result.end)).toBe(true);
  });

  it('start is before end', () => {
    const result = getThisWeekRange();
    expect(new Date(result.start).getTime()).toBeLessThan(new Date(result.end).getTime());
  });
});

describe('getLastWeekRange', () => {
  it('returns object with start and end', () => {
    const result = getLastWeekRange();
    expect(result).toHaveProperty('start');
    expect(result).toHaveProperty('end');
  });

  it('returns valid ISO date strings', () => {
    const result = getLastWeekRange();
    expect(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(result.start)).toBe(true);
    expect(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(result.end)).toBe(true);
  });

  it('start is before end', () => {
    const result = getLastWeekRange();
    expect(new Date(result.start).getTime()).toBeLessThan(new Date(result.end).getTime());
  });

  it('ends before this week starts', () => {
    const lastWeek = getLastWeekRange();
    const thisWeek = getThisWeekRange();
    expect(new Date(lastWeek.end).getTime()).toBeLessThan(new Date(thisWeek.start).getTime());
  });
});