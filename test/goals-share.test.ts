import { describe, it, expect } from "vitest";
import { getGoalProgressPercent, buildPublicGoalSharePath, buildPublicGoalShareUrl } from "../src/lib/goals/share";
describe("getGoalProgressPercent", () => {
  it("returns 0 for zero target", () => { expect(getGoalProgressPercent(5, 0)).toBe(0); });
  it("returns 0 for negative target", () => { expect(getGoalProgressPercent(5, -10)).toBe(0); });
  it("returns 0 when current is negative", () => { expect(getGoalProgressPercent(-5, 10)).toBe(0); });
  it("returns 0 when current is NaN", () => { expect(getGoalProgressPercent(NaN, 10)).toBe(0); });
  it("returns 0 when target is NaN", () => { expect(getGoalProgressPercent(5, NaN)).toBe(0); });
  it("returns 0 when target is Infinity", () => { expect(getGoalProgressPercent(5, Infinity)).toBe(0); });
  it("returns 0 when current is Infinity", () => { expect(getGoalProgressPercent(Infinity, 10)).toBe(0); });
  it("returns correct percentage for simple values", () => {
    expect(getGoalProgressPercent(5, 10)).toBe(50);
    expect(getGoalProgressPercent(1, 3)).toBe(33);
    expect(getGoalProgressPercent(3, 4)).toBe(75);
  });
  it("rounds to nearest integer", () => {
    expect(getGoalProgressPercent(1, 6)).toBe(17);
    expect(getGoalProgressPercent(2, 3)).toBe(67);
  });
  it("caps at 100", () => {
    expect(getGoalProgressPercent(15, 10)).toBe(100);
    expect(getGoalProgressPercent(1000, 10)).toBe(100);
  });
  it("floors at 0", () => { expect(getGoalProgressPercent(-50, 10)).toBe(0); });
});
describe("buildPublicGoalSharePath", () => {
  it("builds correct path for normal inputs", () => { expect(buildPublicGoalSharePath("alice", "goal-123")).toBe("/u/alice/goals/goal-123"); });
  it("encodes username with special characters", () => {
    expect(buildPublicGoalSharePath("alice bob", "goal-123")).toBe("/u/alice%20bob/goals/goal-123");
    expect(buildPublicGoalSharePath("alice@example", "goal-123")).toBe("/u/alice%40example/goals/goal-123");
  });
  it("encodes goalId with special characters", () => {
    expect(buildPublicGoalSharePath("alice", "goal/123")).toBe("/u/alice/goals/goal%2F123");
    expect(buildPublicGoalSharePath("alice", "goal#123")).toBe("/u/alice/goals/goal%23123");
  });
});
describe("buildPublicGoalShareUrl", () => {
  it("builds correct URL", () => { expect(buildPublicGoalShareUrl("https://app.devtrack.io", "alice", "goal-123")).toBe("https://app.devtrack.io/u/alice/goals/goal-123"); });
  it("encodes special characters in path", () => { expect(buildPublicGoalShareUrl("https://app.devtrack.io", "alice bob", "goal-123")).toBe("https://app.devtrack.io/u/alice%20bob/goals/goal-123"); });
});
