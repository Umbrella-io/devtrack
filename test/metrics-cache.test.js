const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

function loadMetricsCacheModule() {
  const sourcePath = path.join(__dirname, "..", "src", "lib", "metrics-cache.ts");
  const outDir = path.join(__dirname, "__generated__");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "metrics-cache.cjs");
  const source = fs.readFileSync(sourcePath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;

  fs.writeFileSync(outPath, output);
  const mod = require(outPath);
  delete require.cache[require.resolve(outPath)];
  return mod;
}

/* ============================================================
   #826 metricsCacheKey — param serialization edge cases
   ============================================================ */

test("metricsCacheKey filters null param values from key", () => {
  delete globalThis.metricsMemoryCache;
  const { metricsCacheKey } = loadMetricsCacheModule();
  const key = metricsCacheKey("user1", "prs", { repo: null, type: "open" });
  assert.equal(key, "metrics:user1:prs:type=open");
});

test("metricsCacheKey filters undefined param values from key", () => {
  delete globalThis.metricsMemoryCache;
  const { metricsCacheKey } = loadMetricsCacheModule();
  const key = metricsCacheKey("user1", "prs", { repo: undefined, type: "open" });
  assert.equal(key, "metrics:user1:prs:type=open");
});

test("metricsCacheKey includes numeric zero as '0' in key", () => {
  delete globalThis.metricsMemoryCache;
  const { metricsCacheKey } = loadMetricsCacheModule();
  const key = metricsCacheKey("user1", "prs", { page: 0 });
  assert.equal(key, "metrics:user1:prs:page=0");
});

test("metricsCacheKey includes empty string in key", () => {
  delete globalThis.metricsMemoryCache;
  const { metricsCacheKey } = loadMetricsCacheModule();
  const key = metricsCacheKey("user1", "prs", { search: "" });
  assert.equal(key, "metrics:user1:prs:search=");
});

/* ============================================================
   #825 cacheGet — cache miss / fallback behavior
   ============================================================ */

test("cacheGet returns null when Redis is unavailable and memory cache is empty", async () => {
  delete globalThis.metricsMemoryCache;
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  const { cacheGet } = loadMetricsCacheModule();
  const result = await cacheGet("nonexistent");
  assert.equal(result, null);
});

test("cacheGet returns null when Redis has no key and falls through catch", async () => {
  delete globalThis.metricsMemoryCache;
  process.env.UPSTASH_REDIS_REST_URL = "http://localhost:1";
  process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
  const { cacheGet } = loadMetricsCacheModule();
  const result = await cacheGet("nonexistent-redis-key");
  assert.equal(result, null);
});

test("cacheGet deletes expired entry from memory cache and returns null", async () => {
  delete globalThis.metricsMemoryCache;
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;

  const expired = { value: "stale", expiresAt: Date.now() - 60000 };
  globalThis.metricsMemoryCache = new Map([["stale-key", expired]]);

  const { cacheGet } = loadMetricsCacheModule();
  const result = await cacheGet("stale-key");
  assert.equal(result, null);
  assert.equal(globalThis.metricsMemoryCache.has("stale-key"), false);
});

test("cacheGet falls back to memory cache when Redis is unavailable", async () => {
  delete globalThis.metricsMemoryCache;
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;

  const fresh = { value: "memory-value", expiresAt: Date.now() + 60000 };
  globalThis.metricsMemoryCache = new Map([["mem-key", fresh]]);

  const { cacheGet } = loadMetricsCacheModule();
  const result = await cacheGet("mem-key");
  assert.equal(result, "memory-value");
});
