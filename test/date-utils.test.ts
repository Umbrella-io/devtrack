import { describe, it, expect } from 'vitest';
import { toDateStr, dateDiffDays } from '../src/lib/dateUtils';

describe('toDateStr', () => {
  it('formats date as YYYY-MM-DD', () => {
    const d = new Date(2026, 4, 24, 12, 0, 0); // 2026-05-24 local noon
    expect(toDateStr(d)).toBe('2026-05-24');
  });

  it('pads single-digit month and day', () => {
    const d = new Date(2026, 0, 5, 12, 0, 0); // 2026-01-05 local noon
    expect(toDateStr(d)).toBe('2026-01-05');
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
