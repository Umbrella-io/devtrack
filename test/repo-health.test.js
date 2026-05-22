const assert = require("node:assert/strict");
const test = require("node:test");

function clamp(n, min, max) {
  if (!Number.isFinite(n)) {
    return min;
  }
  return Math.min(max, Math.max(min, n));
}

function gradeForScore(score) {
  if (score >= 70) return "green";
  if (score >= 40) return "yellow";
  return "red";
}

function computeHealthScore(repo, signals) {
  const score =
    (Math.min(Math.max(signals.commitFrequency || 0, 0), 10) / 10) * 25 +
    clamp(signals.prMergeRate || 0, 0, 1) * 25 +
    (signals.avgPrOpenTimeHours <= 24 ? 20 : signals.avgPrOpenTimeHours >= 168 ? 0 : (1 - (signals.avgPrOpenTimeHours - 24) / (168 - 24)) * 20) +
    (signals.openIssuesCount <= 0 ? 15 : signals.openIssuesCount >= 20 ? 0 : (1 - signals.openIssuesCount / 20) * 15) +
    (signals.daysSinceLastCommit <= 7 ? 15 : signals.daysSinceLastCommit >= 30 ? 0 : (1 - (signals.daysSinceLastCommit - 7) / (30 - 7)) * 15);

  const rounded = Math.round(score);
  const clampedScore = clamp(rounded, 0, 100);

  return {
    repo,
    score: clampedScore,
    signals,
    grade: gradeForScore(clampedScore),
  };
}

test("computeHealthScore returns object with required properties", () => {
  const result = computeHealthScore("test-repo", {
    commitFrequency: 5,
    prMergeRate: 0.8,
    avgPrOpenTimeHours: 48,
    openIssuesCount: 5,
    daysSinceLastCommit: 14,
  });

  assert.ok("repo" in result);
  assert.ok("score" in result);
  assert.ok("signals" in result);
  assert.ok("grade" in result);
});

test("computeHealthScore score is clamped to 0-100", () => {
  const result = computeHealthScore("test-repo", {
    commitFrequency: 100,
    prMergeRate: 2,
    avgPrOpenTimeHours: 1000,
    openIssuesCount: 100,
    daysSinceLastCommit: 1000,
  });

  assert.ok(result.score >= 0 && result.score <= 100);
});

test("computeHealthScore grade is green for score >= 70", () => {
  const result = computeHealthScore("test-repo", {
    commitFrequency: 10,
    prMergeRate: 1,
    avgPrOpenTimeHours: 1,
    openIssuesCount: 0,
    daysSinceLastCommit: 1,
  });

  assert.equal(result.grade, "green");
});

test("computeHealthScore grade is yellow for score >= 40 and < 70", () => {
  const result = computeHealthScore("test-repo", {
    commitFrequency: 5,
    prMergeRate: 0.5,
    avgPrOpenTimeHours: 96,
    openIssuesCount: 10,
    daysSinceLastCommit: 18,
  });

  assert.equal(result.grade, "yellow");
});

test("computeHealthScore grade is red for score < 40", () => {
  const result = computeHealthScore("test-repo", {
    commitFrequency: 0,
    prMergeRate: 0,
    avgPrOpenTimeHours: 200,
    openIssuesCount: 25,
    daysSinceLastCommit: 35,
  });

  assert.equal(result.grade, "red");
});

test("computeHealthScore handles missing signals gracefully", () => {
  const result = computeHealthScore("test-repo", {});
  assert.ok("score" in result);
  assert.ok("grade" in result);
});