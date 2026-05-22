import { describe, it, expect } from 'vitest';
import { computeHealthScore } from '../src/lib/repo-health';

describe('computeHealthScore', () => {
  it('returns object with repo, score, signals, and grade', () => {
    const signals = {
      commitFrequency: 10,
      prMergeRate: 1.0,
      avgPrOpenTimeHours: 12,
      openIssuesCount: 0,
      daysSinceLastCommit: 3,
    };
    const result = computeHealthScore('test/repo', signals);
    expect(result).toHaveProperty('repo', 'test/repo');
    expect(result).toHaveProperty('score');
    expect(result).toHaveProperty('signals');
    expect(result).toHaveProperty('grade');
  });

  it('score is clamped between 0 and 100', () => {
    const signals = {
      commitFrequency: 100,
      prMergeRate: 1.0,
      avgPrOpenTimeHours: 0,
      openIssuesCount: 0,
      daysSinceLastCommit: 0,
    };
    const result = computeHealthScore('test/repo', signals);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('returns green grade for high scores', () => {
    const signals = {
      commitFrequency: 20,
      prMergeRate: 1.0,
      avgPrOpenTimeHours: 12,
      openIssuesCount: 0,
      daysSinceLastCommit: 3,
    };
    const result = computeHealthScore('test/repo', signals);
    expect(result.grade).toBe('green');
  });

  it('returns yellow grade for medium scores', () => {
    const signals = {
      commitFrequency: 5,
      prMergeRate: 0.5,
      avgPrOpenTimeHours: 96,
      openIssuesCount: 10,
      daysSinceLastCommit: 15,
    };
    const result = computeHealthScore('test/repo', signals);
    expect(result.grade).toBe('yellow');
  });

  it('returns red grade for low scores', () => {
    const signals = {
      commitFrequency: 1,
      prMergeRate: 0.2,
      avgPrOpenTimeHours: 200,
      openIssuesCount: 25,
      daysSinceLastCommit: 35,
    };
    const result = computeHealthScore('test/repo', signals);
    expect(result.grade).toBe('red');
  });

  it('signals object is preserved in result', () => {
    const signals = {
      commitFrequency: 7,
      prMergeRate: 0.8,
      avgPrOpenTimeHours: 24,
      openIssuesCount: 5,
      daysSinceLastCommit: 10,
    };
    const result = computeHealthScore('test/repo', signals);
    expect(result.signals).toEqual(signals);
  });
});