const assert = require("node:assert/strict");
const test = require("node:test");
const ts = require("typescript");

const source = require("node:fs").readFileSync("src/lib/dateUtils.ts", "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
});
const moduleExports = {};
const loadDateUtils = new Function("exports", "require", outputText);
loadDateUtils(moduleExports, require);

const { getThisWeekRange, getLastWeekRange, toDateStr, toUtcWallClock, fromUtcWallClock } = moduleExports;

test("getThisWeekRange returns valid ISO date strings for start and end", () => {
  const result = getThisWeekRange();

  assert.equal(typeof result.start, "string");
  assert.equal(typeof result.end, "string");
  assert.ok(result.start.includes("T"));
  assert.ok(result.end.includes("T"));
  assert.notEqual(Date.parse(result.start), NaN);
  assert.notEqual(Date.parse(result.end), NaN);
});

test("getLastWeekRange returns valid ISO date strings with start before end", () => {
  const result = getLastWeekRange();

  assert.equal(typeof result.start, "string");
  assert.equal(typeof result.end, "string");
  assert.ok(result.start.includes("T"));
  assert.ok(result.end.includes("T"));
  assert.notEqual(Date.parse(result.start), NaN);
  assert.notEqual(Date.parse(result.end), NaN);
  assert.ok(new Date(result.start) < new Date(result.end));
});

test("toDateStr formats date correctly as YYYY-MM-DD", () => {
  const date = new Date("2024-06-15T12:00:00Z");
  const result = toDateStr(date);
  assert.equal(result, "2024-06-15");
});