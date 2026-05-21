const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const test = require("node:test");
const ts = require("typescript");

const source = require("node:fs").readFileSync("src/lib/crypto.ts", "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
});
const moduleExports = {};
const loadCrypto = new Function("exports", "require", outputText);
loadCrypto(moduleExports, require);

const { decryptToken, encryptToken } = moduleExports;

test("decryptToken returns null on malformed encrypted input", () => {
  process.env.ENCRYPTION_KEY = randomBytes(32).toString("hex");

  assert.equal(decryptToken("not-hex", "0".repeat(24)), null);
});

test("decryptToken returns null on invalid iv length", () => {
  process.env.ENCRYPTION_KEY = randomBytes(32).toString("hex");

  const encrypted = encryptToken("github-token");
  assert.equal(decryptToken(encrypted.encrypted, "0".repeat(20)), null);
  assert.equal(decryptToken(encrypted.encrypted, "0".repeat(28)), null);
});

test("decryptToken returns null on non-hex iv characters", () => {
  process.env.ENCRYPTION_KEY = randomBytes(32).toString("hex");

  const encrypted = encryptToken("github-token");
  assert.equal(decryptToken(encrypted.encrypted, "xyz".repeat(8)), null);
});