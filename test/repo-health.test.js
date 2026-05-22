const assert = require("node:assert/strict");
const test = require("node:test");

function clamp(n, min, max) {
  if (!Number.isFinite(n)) {
    return min;
  }
  return Math.min(max, Math.max(min, n));
}

function scoreDaysSinceLastCommit(days) {
  if (days <= 7) return 15;
  if (days >= 30) return 0;
  const normalized = 1 - (days - 7) / (30 - 7);
  return clamp(normalized, 0, 1) * 15;
}

test("scoreDaysSinceLastCommit returns 15 for days <= 7", () => {
  assert.equal(scoreDaysSinceLastCommit(0), 15);
  assert.equal(scoreDaysSinceLastCommit(3), 15);
  assert.equal(scoreDaysSinceLastCommit(7), 15);
});

test("scoreDaysSinceLastCommit returns 0 for days >= 30", () => {
  assert.equal(scoreDaysSinceLastCommit(30), 0);
  assert.equal(scoreDaysSinceLastCommit(50), 0);
  assert.equal(scoreDaysSinceLastCommit(100), 0);
});

test("scoreDaysSinceLastCommit scales linearly between 7 and 30 days", () => {
  const midPoint = scoreDaysSinceLastCommit(18.5);
  assert.ok(midPoint > 0 && midPoint < 15);
});

test("scoreDaysSinceLastCommit handles boundary at 7 days", () => {
  assert.equal(scoreDaysSinceLastCommit(7), 15);
});

test("scoreDaysSinceLastCommit handles boundary at 30 days", () => {
  assert.equal(scoreDaysSinceLastCommit(30), 0);
});

test("scoreDaysSinceLastCommit handles NaN", () => {
  assert.equal(scoreDaysSinceLastCommit(NaN), 0);
});

test("scoreDaysSinceLastCommit handles infinity", () => {
  assert.equal(scoreDaysSinceLastCommit(Infinity), 0);
});