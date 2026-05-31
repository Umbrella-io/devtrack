import { describe, it, expect } from "vitest";
import { categorizeStatus, calculateMetrics } from "../src/lib/jira-utils";
import type { JiraIssue } from "../src/lib/jira-utils";

describe("categorizeStatus", () => {
  it('returns "Done" for statusCategory "done"', () => {
    const issue = { statusCategory: "done" } as JiraIssue;
    expect(categorizeStatus(issue)).toBe("Done");
  });

  it('returns "In Progress" for statusCategory "indeterminate"', () => {
    const issue = { statusCategory: "indeterminate" } as JiraIssue;
    expect(categorizeStatus(issue)).toBe("In Progress");
  });

  it('returns "To Do" for statusCategory "new"', () => {
    const issue = { statusCategory: "new" } as JiraIssue;
    expect(categorizeStatus(issue)).toBe("To Do");
  });

  it('returns "To Do" for unknown statusCategory', () => {
    const issue = { statusCategory: "unknown" } as JiraIssue;
    expect(categorizeStatus(issue)).toBe("To Do");
  });
});

describe("calculateMetrics", () => {
  it("returns zero counts for empty array", () => {
    const result = calculateMetrics([]);
    expect(result.total).toBe(0);
    expect(result.toDo).toBe(0);
    expect(result.inProgress).toBe(0);
    expect(result.done).toBe(0);
    expect(result.avgTimeToClose).toBeNull();
  });

  it("counts To Do issues correctly", () => {
    const issues: JiraIssue[] = [
      { key: "PROJ-1", summary: "", status: "", statusCategory: "new", created: "2026-01-01", updated: "2026-01-01", resolved: null, assignee: null, priority: "" },
      { key: "PROJ-2", summary: "", status: "", statusCategory: "new", created: "2026-01-01", updated: "2026-01-01", resolved: null, assignee: null, priority: "" },
    ];
    const result = calculateMetrics(issues);
    expect(result.total).toBe(2);
    expect(result.toDo).toBe(2);
    expect(result.inProgress).toBe(0);
    expect(result.done).toBe(0);
  });

  it("counts In Progress issues correctly", () => {
    const issues: JiraIssue[] = [
      { key: "PROJ-1", summary: "", status: "", statusCategory: "indeterminate", created: "2026-01-01", updated: "2026-01-01", resolved: null, assignee: null, priority: "" },
    ];
    const result = calculateMetrics(issues);
    expect(result.total).toBe(1);
    expect(result.toDo).toBe(0);
    expect(result.inProgress).toBe(1);
    expect(result.done).toBe(0);
  });

  it("counts Done issues correctly", () => {
    const issues: JiraIssue[] = [
      { key: "PROJ-1", summary: "", status: "", statusCategory: "done", created: "2026-01-01", updated: "2026-01-01", resolved: "2026-01-02", assignee: null, priority: "" },
    ];
    const result = calculateMetrics(issues);
    expect(result.total).toBe(1);
    expect(result.toDo).toBe(0);
    expect(result.inProgress).toBe(0);
    expect(result.done).toBe(1);
  });

  it("calculates average time to close correctly", () => {
    const issues: JiraIssue[] = [
      { key: "PROJ-1", summary: "", status: "", statusCategory: "done", created: "2026-01-01T00:00:00Z", updated: "2026-01-01T00:00:00Z", resolved: "2026-01-02T00:00:00Z", assignee: null, priority: "" },
      { key: "PROJ-2", summary: "", status: "", statusCategory: "done", created: "2026-01-01T00:00:00Z", updated: "2026-01-01T00:00:00Z", resolved: "2026-01-03T00:00:00Z", assignee: null, priority: "" },
    ];
    const result = calculateMetrics(issues);
    expect(result.total).toBe(2);
    expect(result.done).toBe(2);
    expect(result.avgTimeToClose).toBe(36);
  });

  it("returns null avgTimeToClose when no issues are resolved", () => {
    const issues: JiraIssue[] = [
      { key: "PROJ-1", summary: "", status: "", statusCategory: "done", created: "2026-01-01", updated: "2026-01-01", resolved: null, assignee: null, priority: "" },
    ];
    const result = calculateMetrics(issues);
    expect(result.done).toBe(1);
    expect(result.avgTimeToClose).toBeNull();
  });

  it("handles mixed status categories", () => {
    const issues: JiraIssue[] = [
      { key: "PROJ-1", summary: "", status: "", statusCategory: "new", created: "2026-01-01", updated: "2026-01-01", resolved: null, assignee: null, priority: "" },
      { key: "PROJ-2", summary: "", status: "", statusCategory: "indeterminate", created: "2026-01-01", updated: "2026-01-01", resolved: null, assignee: null, priority: "" },
      { key: "PROJ-3", summary: "", status: "", statusCategory: "done", created: "2026-01-01", updated: "2026-01-01", resolved: "2026-01-02", assignee: null, priority: "" },
    ];
    const result = calculateMetrics(issues);
    expect(result.total).toBe(3);
    expect(result.toDo).toBe(1);
    expect(result.inProgress).toBe(1);
    expect(result.done).toBe(1);
  });
});
