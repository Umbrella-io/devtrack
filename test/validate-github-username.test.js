const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

function loadValidatorModule() {
  const sourcePath = path.join(
    __dirname,
    "..",
    "src",
    "lib",
    "validate-github-username.ts"
  );
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "devtrack-github-user-"));
  const outPath = path.join(outDir, "validate-github-username.cjs");
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

test("isValidGitHubUsername accepts valid GitHub usernames", () => {
  const { isValidGitHubUsername } = loadValidatorModule();

  assert.equal(isValidGitHubUsername("octocat"), true);
  assert.equal(isValidGitHubUsername("dev-track"), true);
  assert.equal(isValidGitHubUsername("A1b2C3"), true);
  assert.equal(isValidGitHubUsername("a".repeat(39)), true);
});

test("isValidGitHubUsername rejects path and query injection attempts", () => {
  const { isValidGitHubUsername } = loadValidatorModule();

  assert.equal(isValidGitHubUsername("../search/repositories?q=test"), false);
  assert.equal(isValidGitHubUsername("someuser+org:private-org"), false);
  assert.equal(isValidGitHubUsername("-leadinghyphen"), false);
  assert.equal(isValidGitHubUsername("trailinghyphen-"), false);
  assert.equal(isValidGitHubUsername("a".repeat(40)), false);
});

test("normalizeGitHubUsername trims and validates input", () => {
  const { normalizeGitHubUsername } = loadValidatorModule();

  assert.equal(normalizeGitHubUsername("  octocat  "), "octocat");
  assert.equal(normalizeGitHubUsername(""), null);
  assert.equal(normalizeGitHubUsername("   "), null);
  assert.equal(normalizeGitHubUsername(null), null);
  assert.equal(normalizeGitHubUsername("bad/user"), null);
});
