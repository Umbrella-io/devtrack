const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

function loadCryptoModule() {
  const sourcePath = path.join(__dirname, "..", "src", "lib", "crypto.ts");
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "devtrack-crypto-"));
  const outPath = path.join(outDir, "crypto.cjs");
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

test("decryptToken rejects malformed IV before decipher creation", () => {
  const { decryptToken } = loadCryptoModule();
  process.env.ENCRYPTION_KEY = "a".repeat(64);
  const originalError = console.error;
  console.error = () => {};

  try {
    assert.equal(decryptToken("0".repeat(32), "abcd"), null);
  } finally {
    console.error = originalError;
  }
});

test("decryptToken rejects payloads shorter than the auth tag", () => {
  const { decryptToken } = loadCryptoModule();
  process.env.ENCRYPTION_KEY = "b".repeat(64);
  const originalError = console.error;
  console.error = () => {};

  try {
    assert.equal(decryptToken("0".repeat(30), "1".repeat(24)), null);
  } finally {
    console.error = originalError;
  }
});

test("decryptToken still decrypts valid encrypted tokens", () => {
  const { decryptToken, encryptToken } = loadCryptoModule();
  process.env.ENCRYPTION_KEY = "c".repeat(64);

  const encrypted = encryptToken("github-token-123");

  assert.equal(
    decryptToken(encrypted.encrypted, encrypted.iv),
    "github-token-123"
  );
});
