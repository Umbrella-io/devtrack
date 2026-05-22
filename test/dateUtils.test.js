const assert = require("node:assert/strict");
const test = require("node:test");
const { getThisWeekRange, getLastWeekRange } = require("../src/lib/dateUtils.js");

test("getThisWeekRange returns object with start and end", () => {
  const result = getThisWeekRange();
  assert.ok("start" in result);
  assert.ok("end" in result);
});

test("getThisWeekRange returns valid ISO date strings", () => {
  const result = getThisWeekRange();
  assert.ok(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(result.start));
  assert.ok(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(result.end));
});

test("getThisWeekRange start is before end", () => {
  const result = getThisWeekRange();
  assert.ok(new Date(result.start).getTime() < new Date(result.end).getTime());
});

test("getLastWeekRange returns object with start and end", () => {
  const result = getLastWeekRange();
  assert.ok("start" in result);
  assert.ok("end" in result);
});

test("getLastWeekRange returns valid ISO date strings", () => {
  const result = getLastWeekRange();
  assert.ok(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(result.start));
  assert.ok(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(result.end));
});

test("getLastWeekRange start is before end", () => {
  const result = getLastWeekRange();
  assert.ok(new Date(result.start).getTime() < new Date(result.end).getTime());
});

test("getLastWeekRange ends before this week starts", () => {
  const lastWeek = getLastWeekRange();
  const thisWeek = getThisWeekRange();
  assert.ok(new Date(lastWeek.end).getTime() < new Date(thisWeek.start).getTime());
});