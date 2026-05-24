import { describe, it, expect } from 'vitest';

function mergeContributionDays(
  a: Record<string, number>,
  b: Record<string, number>
): Record<string, number> {
  const result = { ...a };
  for (const [date, count] of Object.entries(b)) {
    result[date] = (result[date] ?? 0) + count;
  }
  return result;
}

describe('mergeContributionDays', () => {
  it('returns copy of first argument when second is empty', () => {
    const result = mergeContributionDays({ '2024-07-01': 3, '2024-07-02': 5 }, {});
    expect(result).toEqual({ '2024-07-01': 3, '2024-07-02': 5 });
  });

  it('merges two accounts: sums counts for overlapping dates', () => {
    const result = mergeContributionDays(
      { '2024-07-01': 3, '2024-07-02': 5 },
      { '2024-07-01': 2, '2024-07-03': 1 }
    );
    expect(result['2024-07-01']).toBe(5); // 3 + 2
    expect(result['2024-07-02']).toBe(5);
    expect(result['2024-07-03']).toBe(1);
  });

  it('date keys are preserved in YYYY-MM-DD format', () => {
    const result = mergeContributionDays(
      { '2024-01-01': 1, '2024-12-31': 1 },
      {}
    );
    expect(Object.keys(result)).toHaveLength(2);
    expect(result['2024-01-01']).toBe(1);
    expect(result['2024-12-31']).toBe(1);
  });

  it('handles missing dates (undefined) in one account but present in another', () => {
    const result = mergeContributionDays(
      { '2024-07-01': 5 },
      { '2024-07-02': 3 }
    );
    expect(result['2024-07-01']).toBe(5);
    expect(result['2024-07-02']).toBe(3);
  });

  it('does not mutate original contribution maps', () => {
    const contrib1 = { '2024-07-01': 3 };
    const contrib2 = { '2024-07-02': 5 };
    const original1 = JSON.stringify(contrib1);
    const original2 = JSON.stringify(contrib2);
    mergeContributionDays(contrib1, contrib2);
    expect(JSON.stringify(contrib1)).toBe(original1);
    expect(JSON.stringify(contrib2)).toBe(original2);
  });

  it('correctly sums counts across all accounts for same date', () => {
    const first = mergeContributionDays(
      { '2024-07-15': 10 },
      { '2024-07-15': 20 }
    );
    const result = mergeContributionDays(first, { '2024-07-15': 30 });
    expect(result['2024-07-15']).toBe(60);
  });

  it('handles empty first contribution map', () => {
    const result = mergeContributionDays(
      {},
      { '2024-07-01': 5 }
    );
    expect(result['2024-07-01']).toBe(5);
  });

  it('result has correct total count across all dates', () => {
    const result = mergeContributionDays(
      { '2024-07-01': 1, '2024-07-02': 2 },
      { '2024-07-01': 3, '2024-07-03': 4 }
    );
    const total = Object.values(result).reduce((sum, c) => sum + c, 0);
    expect(total).toBe(10); // 1+2 + 3+4
  });

  it('returns empty object when both are empty', () => {
    const result = mergeContributionDays({}, {});
    expect(result).toEqual({});
  });

  it('overlapping dates accumulate correctly', () => {
    const result = mergeContributionDays(
      { '2024-07-01': 1, '2024-07-02': 2, '2024-07-03': 3 },
      { '2024-07-02': 4, '2024-07-03': 5, '2024-07-04': 6 }
    );
    expect(result['2024-07-01']).toBe(1);
    expect(result['2024-07-02']).toBe(6);  // 2 + 4
    expect(result['2024-07-03']).toBe(8);  // 3 + 5
    expect(result['2024-07-04']).toBe(6);
  });
});
