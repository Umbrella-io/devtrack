import { describe, it, expect } from 'vitest';
import { metricsCacheKey, METRICS_CACHE_TTL_SECONDS } from '../src/lib/metrics-cache';

describe('metricsCacheKey', () => {
  it('returns a string containing userId, endpoint, and params', () => {
    const key = metricsCacheKey('user123', 'contributions', { days: 30 });
    expect(key).toContain('user123');
    expect(key).toContain('contributions');
    expect(key).toContain('days=30');
  });

  it('returns default when no params provided', () => {
    const key = metricsCacheKey('user123', 'prs');
    expect(key).toContain('user123');
    expect(key).toContain('prs');
    expect(key).toContain('default');
  });

  it('filters out undefined and null values', () => {
    const key = metricsCacheKey('user123', 'repos', {
      days: 30,
      undefinedValue: undefined,
      nullValue: null,
    });
    expect(key).toContain('days=30');
    expect(key).not.toContain('undefinedValue');
    expect(key).not.toContain('nullValue');
  });

  it('sorts params alphabetically for consistent keys', () => {
    const key1 = metricsCacheKey('user123', 'streak', { z: 1, a: 2 });
    const key2 = metricsCacheKey('user123', 'streak', { a: 2, z: 1 });
    expect(key1).toBe(key2);
  });

  it('uses correct endpoint from METRICS_CACHE_TTL_SECONDS', () => {
    const contributionsKey = metricsCacheKey('user', 'contributions');
    const reposKey = metricsCacheKey('user', 'repos');
    expect(contributionsKey).not.toBe(reposKey);
    expect(contributionsKey).toContain('contributions');
    expect(reposKey).toContain('repos');
  });
});