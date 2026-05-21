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

test("decryptToken returns the original plaintext for valid encrypted input", () => {
  process.env.ENCRYPTION_KEY = randomBytes(32).toString("hex");

  const token = "github-token";
  const encrypted = encryptToken(token);

  assert.equal(decryptToken(encrypted.encrypted, encrypted.iv), token);
});

test("encryptToken returns non-empty encrypted output and iv", () => {
  process.env.ENCRYPTION_KEY = randomBytes(32).toString("hex");

  const token = "github-token";
  const result = encryptToken(token);

  assert.equal(typeof result.encrypted, "string");
  assert.ok(result.encrypted.length > 0);
  assert.equal(typeof result.iv, "string");
  assert.equal(result.iv.length, 24);
});

test("decryptToken returns null on malformed encrypted input", () => {
  process.env.ENCRYPTION_KEY = randomBytes(32).toString("hex");

  assert.equal(decryptToken("not-hex", "0".repeat(24)), null);
});

test("decryptToken returns null on invalid auth tag", () => {
  process.env.ENCRYPTION_KEY = randomBytes(32).toString("hex");

  const encrypted = encryptToken("github-token");
  const tampered = `${encrypted.encrypted.slice(0, -2)}00`;

  assert.equal(decryptToken(tampered, encrypted.iv), null);
});

test("decryptToken returns null on empty ciphertext", () => {
  process.env.ENCRYPTION_KEY = randomBytes(32).toString("hex");

  assert.equal(decryptToken("0".repeat(32), "0".repeat(24)), null);
});
