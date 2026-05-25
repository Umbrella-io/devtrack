import { describe, it, expect } from 'vitest';

describe('toDateStr', () => {
  function toDateStr(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  it('formats date as YYYY-MM-DD', () => {
    const d = new Date('2026-05-24T12:00:00Z');
    expect(toDateStr(d)).toBe('2026-05-24');
  });

  it('pads single-digit month and day', () => {
    const d = new Date('2026-01-05T12:00:00Z');
    expect(toDateStr(d)).toBe('2026-01-05');
  });
});

describe('dateDiffDays', () => {
  function dateDiffDays(a: string, b: string): number {
    return (new Date(b).getTime() - new Date(a).getTime()) / 86400000;
  }

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
