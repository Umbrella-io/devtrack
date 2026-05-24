const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

function loadUpstashRestModule() {
  const sourcePath = path.join(__dirname, "..", "src", "lib", "upstash-rest.ts");
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "devtrack-upstash-rest-"));
  const outPath = path.join(outDir, "upstash-rest.cjs");
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

test("getUpstashConfig returns null when env is missing", () => {
  const mod = loadUpstashRestModule();
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  assert.equal(mod.getUpstashConfig(), null);
});

test("upstashRateLimitFixedWindow sets expiry for new buckets", async () => {
  const mod = loadUpstashRestModule();
  process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
  process.env.UPSTASH_REDIS_REST_TOKEN = "token";

  const originalFetch = global.fetch;
  let call = 0;
  global.fetch = async (url, init) => {
    call += 1;
    assert.ok(String(url).includes("/pipeline"));
    const body = JSON.parse(init.body);

    if (call === 1) {
      assert.deepEqual(body, [["INCR", "k"], ["TTL", "k"]]);
      return {
        ok: true,
        async json() {
          return [{ result: 1 }, { result: -1 }];
        },
      };
    }

    assert.deepEqual(body, [["EXPIRE", "k", 60]]);
    return {
      ok: true,
      async json() {
        return [{ result: 1 }];
      },
    };
  };

  try {
    const result = await mod.upstashRateLimitFixedWindow({
      key: "k",
      limit: 20,
      windowSeconds: 60,
    });
    assert.deepEqual(result, { allowed: true });
  } finally {
    global.fetch = originalFetch;
  }
});

test("upstashRateLimitFixedWindow returns retryAfter from TTL", async () => {
  const mod = loadUpstashRestModule();
  process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
  process.env.UPSTASH_REDIS_REST_TOKEN = "token";

  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    async json() {
      return [{ result: 21 }, { result: 10 }];
    },
  });

  try {
    const result = await mod.upstashRateLimitFixedWindow({
      key: "k2",
      limit: 20,
      windowSeconds: 60,
    });
    assert.deepEqual(result, { allowed: false, retryAfter: 10 });
  } finally {
    global.fetch = originalFetch;
  }
});

test("upstashTryAcquireLock returns true only when SET succeeds", async () => {
  const mod = loadUpstashRestModule();
  process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
  process.env.UPSTASH_REDIS_REST_TOKEN = "token";

  const originalFetch = global.fetch;
  let returnedOk = false;
  global.fetch = async () => ({
    ok: true,
    async json() {
      returnedOk = !returnedOk;
      return [{ result: returnedOk ? "OK" : null }];
    },
  });

  try {
    assert.equal(
      await mod.upstashTryAcquireLock({ key: "lock", ttlSeconds: 30 }),
      true
    );
    assert.equal(
      await mod.upstashTryAcquireLock({ key: "lock", ttlSeconds: 30 }),
      false
    );
  } finally {
    global.fetch = originalFetch;
  }
});

