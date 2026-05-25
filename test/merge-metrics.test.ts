import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: {} as any }));

describe('mergeMetrics', () => {
  it('returns null when all results are rejected', async () => {
    const { mergeMetrics } = await import('../src/lib/github-accounts');
    const results = await Promise.allSettled([
      Promise.reject(new Error('fail 1')),
      Promise.reject(new Error('fail 2')),
    ]);
    const result = mergeMetrics(results, (a: string, b: string) => a);
    expect(result).toBeNull();
  });

  it('returns single value when only one result is fulfilled', async () => {
    const { mergeMetrics } = await import('../src/lib/github-accounts');
    const results = await Promise.allSettled([
      Promise.resolve('only-value'),
      Promise.reject(new Error('fail')),
    ]);
    const result = mergeMetrics(results, (a: string, b: string) => a);
    expect(result).toBe('only-value');
  });

  it('merges multiple fulfilled values using the provided merge function', async () => {
    const { mergeMetrics } = await import('../src/lib/github-accounts');
    const results = await Promise.allSettled([
      Promise.resolve(1),
      Promise.resolve(2),
      Promise.resolve(3),
    ]);
    const result = mergeMetrics(results, (a: number, b: number) => a + b);
    expect(result).toBe(6);
  });

  it('skips rejected and merges partially fulfilled results', async () => {
    const { mergeMetrics } = await import('../src/lib/github-accounts');
    const results = await Promise.allSettled([
      Promise.resolve('a'),
      Promise.reject(new Error('fail')),
      Promise.resolve('c'),
    ]);
    const result = mergeMetrics(results, (a: string, b: string) => a + b);
    expect(result).toBe('ac');
  });

  it('handles single fulfilled result with no merge needed', async () => {
    const { mergeMetrics } = await import('../src/lib/github-accounts');
    const results = await Promise.allSettled([Promise.resolve(42)]);
    const result = mergeMetrics(results, (a: number, b: number) => a + b);
    expect(result).toBe(42);
  });

  it('preserves type through merge for objects', async () => {
    const { mergeMetrics } = await import('../src/lib/github-accounts');
    const results = await Promise.allSettled([
      Promise.resolve({ count: 5, label: 'a' }),
      Promise.resolve({ count: 3, label: 'b' }),
    ]);
    const result = mergeMetrics(results, (a, b) => ({
      count: a.count + b.count,
      label: a.label + b.label,
    }));
    expect(result).toEqual({ count: 8, label: 'ab' });
  });

  it('works with empty array', async () => {
    const { mergeMetrics } = await import('../src/lib/github-accounts');
    const result = mergeMetrics([], (a: number, b: number) => a + b);
    expect(result).toBeNull();
  });
});
