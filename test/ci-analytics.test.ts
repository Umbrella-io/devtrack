import { describe, it, expect } from "vitest";
import { mergeCIAnalytics } from "../src/lib/ci-analytics";
import type { CIAnalyticsResponse } from "../src/lib/ci-analytics";

describe("mergeCIAnalytics", () => {
  it("merges two empty responses", () => {
    const a: CIAnalyticsResponse = {
      successRate: 0, averageDurationMinutes: 0, flakiestWorkflow: null, totalRuns: 0, reposChecked: 0,
    };
    const b: CIAnalyticsResponse = {
      successRate: 0, averageDurationMinutes: 0, flakiestWorkflow: null, totalRuns: 0, reposChecked: 0,
    };
    const result = mergeCIAnalytics(a, b);
    expect(result.totalRuns).toBe(0);
    expect(result.successRate).toBe(0);
  });

  it("merges responses with 100% success rate", () => {
    const a: CIAnalyticsResponse = {
      successRate: 100, averageDurationMinutes: 10, flakiestWorkflow: null, totalRuns: 10, reposChecked: 1,
    };
    const b: CIAnalyticsResponse = {
      successRate: 100, averageDurationMinutes: 20, flakiestWorkflow: null, totalRuns: 10, reposChecked: 1,
    };
    const result = mergeCIAnalytics(a, b);
    expect(result.totalRuns).toBe(20);
    expect(result.successRate).toBe(100);
  });

  it("calculates weighted average duration", () => {
    const a: CIAnalyticsResponse = {
      successRate: 100, averageDurationMinutes: 10, flakiestWorkflow: null, totalRuns: 10, reposChecked: 1,
    };
    const b: CIAnalyticsResponse = {
      successRate: 100, averageDurationMinutes: 20, flakiestWorkflow: null, totalRuns: 10, reposChecked: 1,
    };
    const result = mergeCIAnalytics(a, b);
    expect(result.averageDurationMinutes).toBe(15);
  });

  it("merges success rates correctly", () => {
    const a: CIAnalyticsResponse = {
      successRate: 50, averageDurationMinutes: 10, flakiestWorkflow: "workflow1", totalRuns: 10, reposChecked: 1,
    };
    const b: CIAnalyticsResponse = {
      successRate: 100, averageDurationMinutes: 10, flakiestWorkflow: "workflow2", totalRuns: 10, reposChecked: 1,
    };
    const result = mergeCIAnalytics(a, b);
    expect(result.totalRuns).toBe(20);
    expect(result.successRate).toBe(75);
  });

  it("selects flakiest workflow from first when both have failures", () => {
    const a: CIAnalyticsResponse = {
      successRate: 50, averageDurationMinutes: 10, flakiestWorkflow: "workflow1", totalRuns: 10, reposChecked: 1,
    };
    const b: CIAnalyticsResponse = {
      successRate: 50, averageDurationMinutes: 10, flakiestWorkflow: "workflow2", totalRuns: 10, reposChecked: 1,
    };
    const result = mergeCIAnalytics(a, b);
    expect(result.flakiestWorkflow).toBe("workflow1");
  });

  it("uses flakiest from second when first is null", () => {
    const a: CIAnalyticsResponse = {
      successRate: 100, averageDurationMinutes: 10, flakiestWorkflow: null, totalRuns: 10, reposChecked: 1,
    };
    const b: CIAnalyticsResponse = {
      successRate: 50, averageDurationMinutes: 10, flakiestWorkflow: "workflow2", totalRuns: 10, reposChecked: 1,
    };
    const result = mergeCIAnalytics(a, b);
    expect(result.flakiestWorkflow).toBe("workflow2");
  });

  it("accumulates reposChecked", () => {
    const a: CIAnalyticsResponse = {
      successRate: 100, averageDurationMinutes: 10, flakiestWorkflow: null, totalRuns: 5, reposChecked: 3,
    };
    const b: CIAnalyticsResponse = {
      successRate: 100, averageDurationMinutes: 10, flakiestWorkflow: null, totalRuns: 5, reposChecked: 2,
    };
    const result = mergeCIAnalytics(a, b);
    expect(result.reposChecked).toBe(5);
  });

  it("merges failed repos arrays", () => {
    const a: CIAnalyticsResponse = {
      successRate: 50, averageDurationMinutes: 10, flakiestWorkflow: null, totalRuns: 10, reposChecked: 1, failedRepos: ["repo1"],
    };
    const b: CIAnalyticsResponse = {
      successRate: 50, averageDurationMinutes: 10, flakiestWorkflow: null, totalRuns: 10, reposChecked: 1, failedRepos: ["repo2"],
    };
    const result = mergeCIAnalytics(a, b);
    expect(result.failedRepos).toEqual(["repo1", "repo2"]);
  });

  it("handles undefined failedRepos", () => {
    const a: CIAnalyticsResponse = {
      successRate: 50, averageDurationMinutes: 10, flakiestWorkflow: null, totalRuns: 10, reposChecked: 1,
    };
    const b: CIAnalyticsResponse = {
      successRate: 50, averageDurationMinutes: 10, flakiestWorkflow: null, totalRuns: 10, reposChecked: 1, failedRepos: ["repo2"],
    };
    const result = mergeCIAnalytics(a, b);
    expect(result.failedRepos).toEqual(["repo2"]);
  });
});