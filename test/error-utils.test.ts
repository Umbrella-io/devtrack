const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

function loadErrorUtilsModule() {
  const sourcePath = path.join(__dirname, "..", "src", "lib", "error-utils.ts");
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "devtrack-error-utils-"));
  const outPath = path.join(outDir, "error-utils.cjs");
  const source = fs.readFileSync(sourcePath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;

  fs.writeFileSync(outPath, output);
  return require(outPath);
}

test("getSafeApiErrorMessage returns known safe message for TokenRevoked", () => {
  const { getSafeApiErrorMessage } = loadErrorUtilsModule();
  assert.equal(getSafeApiErrorMessage("TokenRevoked"), "Your GitHub session has expired. Please sign in again.");
});

test("getSafeApiErrorMessage returns known safe message for Unauthorized", () => {
  const { getSafeApiErrorMessage } = loadErrorUtilsModule();
  assert.equal(getSafeApiErrorMessage("Unauthorized"), "You must be signed in to view this page.");
});

test("getSafeApiErrorMessage returns known safe message for Configuration error", () => {
  const { getSafeApiErrorMessage } = loadErrorUtilsModule();
  assert.equal(getSafeApiErrorMessage("Configuration error"), "There is a configuration issue. Please contact support.");
});

test("getSafeApiErrorMessage returns generic message for unknown error in production", () => {
  const { getSafeApiErrorMessage } = loadErrorUtilsModule();
  assert.equal(getSafeApiErrorMessage("UnknownError", "production"), "An unexpected error occurred.");
});

test("getSafeApiErrorMessage returns raw message for unknown error in development", () => {
  const { getSafeApiErrorMessage } = loadErrorUtilsModule();
  assert.equal(getSafeApiErrorMessage("SomeError", "development"), "SomeError");
});

test("getSafeApiErrorMessage defaults to production when env not provided", () => {
  const { getSafeApiErrorMessage } = loadErrorUtilsModule();
  assert.equal(getSafeApiErrorMessage("RandomError"), "An unexpected error occurred.");
});

test("getSafeApiErrorMessage handles empty string message in production", () => {
  const { getSafeApiErrorMessage } = loadErrorUtilsModule();
  assert.equal(getSafeApiErrorMessage("", "production"), "An unexpected error occurred.");
});

test("getSafeApiErrorMessage handles empty string message in development", () => {
  const { getSafeApiErrorMessage } = loadErrorUtilsModule();
  assert.equal(getSafeApiErrorMessage("", "development"), "Unknown error");
});