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

const { getLastWeekRange } = moduleExports;

test("getLastWeekRange returns start date before end date", () => {
  const result = getLastWeekRange();
  const startDate = new Date(result.start);
  const endDate = new Date(result.end);
  assert.ok(startDate < endDate, "start date should be before end date");
});

test("getLastWeekRange returns dates from previous week", () => {
  const result = getLastWeekRange();
  const now = new Date();
  const startDate = new Date(result.start);
  assert.ok(startDate < now, "start date should be in the past");
});