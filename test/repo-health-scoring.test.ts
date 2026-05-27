import { describe, it, expect } from 'vitest';
import { scoreAvgPrOpenTimeHours, computeHealthScore } from '../src/lib/repo-health';
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

describe('scoreAvgPrOpenTimeHours', () => {
  it('returns 20 for 0-24 hours (full score)', () => {
    expect(scoreAvgPrOpenTimeHours(0)).toBe(20);
    expect(scoreAvgPrOpenTimeHours(12)).toBe(20);
  });

  it('returns 20 at exactly 24 hours boundary', () => {
    expect(scoreAvgPrOpenTimeHours(24)).toBe(20);
  });

  it('scales linearly between 24 and 168 hours', () => {
    // 24 hours = 20 points
    // 168 hours = 0 points
    // Halfway point: 96 hours = 10 points
    expect(scoreAvgPrOpenTimeHours(96)).toBe(10);
    
    // Quarter point: 60 hours = 15 points
    expect(scoreAvgPrOpenTimeHours(60)).toBe(15);
  });

  it('returns 0 at exactly 168 hours boundary', () => {
    expect(scoreAvgPrOpenTimeHours(168)).toBe(0);
  });

  it('returns 0 for >168 hours', () => {
    expect(scoreAvgPrOpenTimeHours(169)).toBe(0);
    expect(scoreAvgPrOpenTimeHours(200)).toBe(0);
  });

  it('handles non-finite values (Infinity, -Infinity, NaN)', () => {
    expect(scoreAvgPrOpenTimeHours(NaN)).toBe(0);
    expect(scoreAvgPrOpenTimeHours(Infinity)).toBe(0);
    expect(scoreAvgPrOpenTimeHours(-Infinity)).toBe(20);
  });

  it('handles negative hours gracefully', () => {
    expect(scoreAvgPrOpenTimeHours(-10)).toBe(20);
  });
});
