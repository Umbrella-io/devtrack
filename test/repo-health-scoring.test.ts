import { describe, it, expect } from 'vitest';
import { computeHealthScore } from '../src/lib/repo-health';
import type { RepoHealthSignals } from '../src/types/repo-health';

describe('gradeForScore', () => {
  const worstSignals: RepoHealthSignals = {
    commitFrequency: 0,
    prMergeRate: 0,
    avgPrOpenTimeHours: 9999,
    openIssuesCount: 9999,
    daysSinceLastCommit: 9999,
  };

  const bestSignals: RepoHealthSignals = {
    commitFrequency: 10,
    prMergeRate: 1,
    avgPrOpenTimeHours: 0,
    openIssuesCount: 0,
    daysSinceLastCommit: 0,
  };

  it('returns red for worst signals', () => {
    expect(
      computeHealthScore('repo', worstSignals).grade
    ).toBe('red');
  });

  it('returns green for perfect signals', () => {
    expect(
      computeHealthScore('repo', bestSignals).grade
    ).toBe('green');
  });

  it('handles Infinity', () => {
    const result = computeHealthScore('repo', {
      ...worstSignals,
      commitFrequency: Infinity,
    });

    expect(result.grade).toBeDefined();
  });

  it('handles -Infinity', () => {
    const result = computeHealthScore('repo', {
      ...worstSignals,
      commitFrequency: -Infinity,
    });

    expect(result.grade).toBeDefined();
  });

  it('handles NaN', () => {
    const result = computeHealthScore('repo', {
      ...worstSignals,
      commitFrequency: NaN,
    });

    expect(result.grade).toBeDefined();
  });
});