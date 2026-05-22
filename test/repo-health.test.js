const assert = require("node:assert/strict");
const test = require("node:test");

function gradeForScore(score) {
  if (score >= 70) return "green";
  if (score >= 40) return "yellow";
  return "red";
}

test("gradeForScore returns green for score >= 70", () => {
  assert.equal(gradeForScore(70), "green");
  assert.equal(gradeForScore(85), "green");
  assert.equal(gradeForScore(100), "green");
});

test("gradeForScore returns yellow for score >= 40 and < 70", () => {
  assert.equal(gradeForScore(40), "yellow");
  assert.equal(gradeForScore(55), "yellow");
  assert.equal(gradeForScore(69), "yellow");
});

test("gradeForScore returns red for score < 40", () => {
  assert.equal(gradeForScore(0), "red");
  assert.equal(gradeForScore(39), "red");
  assert.equal(gradeForScore(-10), "red");
});

test("gradeForScore boundary at 70", () => {
  assert.equal(gradeForScore(69.99), "yellow");
  assert.equal(gradeForScore(70), "green");
});

test("gradeForScore boundary at 40", () => {
  assert.equal(gradeForScore(39.99), "red");
  assert.equal(gradeForScore(40), "yellow");
});