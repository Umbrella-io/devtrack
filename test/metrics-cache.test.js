const assert = require("node:assert/strict");
const test = require("node:test");

function createMockNextRequest(url, headers = {}) {
  const urlObj = new URL(url);
  return {
    nextUrl: {
      searchParams: urlObj.searchParams,
    },
    headers: {
      get: (name) => headers[name] || null,
    },
  };
}

test("isMetricsCacheBypassed returns true for refresh=1", async () => {
  const { isMetricsCacheBypassed } = require("../src/lib/metrics-cache.js");
  const req = createMockNextRequest("http://localhost?refresh=1");
  const result = isMetricsCacheBypassed(req);
  assert.equal(result, true);
});

test("isMetricsCacheBypassed returns true for refresh=true", async () => {
  const { isMetricsCacheBypassed } = require("../src/lib/metrics-cache.js");
  const req = createMockNextRequest("http://localhost?refresh=true");
  const result = isMetricsCacheBypassed(req);
  assert.equal(result, true);
});

test("isMetricsCacheBypassed returns true for refresh=yes", async () => {
  const { isMetricsCacheBypassed } = require("../src/lib/metrics-cache.js");
  const req = createMockNextRequest("http://localhost?refresh=yes");
  const result = isMetricsCacheBypassed(req);
  assert.equal(result, true);
});

test("isMetricsCacheBypassed returns true for refresh=on", async () => {
  const { isMetricsCacheBypassed } = require("../src/lib/metrics-cache.js");
  const req = createMockNextRequest("http://localhost?refresh=on");
  const result = isMetricsCacheBypassed(req);
  assert.equal(result, true);
});

test("isMetricsCacheBypassed returns true for bypassCache=true", async () => {
  const { isMetricsCacheBypassed } = require("../src/lib/metrics-cache.js");
  const req = createMockNextRequest("http://localhost?bypassCache=true");
  const result = isMetricsCacheBypassed(req);
  assert.equal(result, true);
});

test("isMetricsCacheBypassed returns true for sync=1", async () => {
  const { isMetricsCacheBypassed } = require("../src/lib/metrics-cache.js");
  const req = createMockNextRequest("http://localhost?sync=1");
  const result = isMetricsCacheBypassed(req);
  assert.equal(result, true);
});

test("isMetricsCacheBypassed returns false when no bypass params", async () => {
  const { isMetricsCacheBypassed } = require("../src/lib/metrics-cache.js");
  const req = createMockNextRequest("http://localhost");
  const result = isMetricsCacheBypassed(req);
  assert.equal(result, false);
});

test("isMetricsCacheBypassed returns true for x-devtrack-cache-bypass header", async () => {
  const { isMetricsCacheBypassed } = require("../src/lib/metrics-cache.js");
  const req = createMockNextRequest("http://localhost", {
    "x-devtrack-cache-bypass": "true",
  });
  const result = isMetricsCacheBypassed(req);
  assert.equal(result, true);
});

test("isMetricsCacheBypassed is case insensitive for header values", async () => {
  const { isMetricsCacheBypassed } = require("../src/lib/metrics-cache.js");
  const req = createMockNextRequest("http://localhost", {
    "x-devtrack-cache-bypass": "TRUE",
  });
  const result = isMetricsCacheBypassed(req);
  assert.equal(result, true);
});

test("isMetricsCacheBypassed returns false for empty header value", async () => {
  const { isMetricsCacheBypassed } = require("../src/lib/metrics-cache.js");
  const req = createMockNextRequest("http://localhost", {
    "x-devtrack-cache-bypass": "",
  });
  const result = isMetricsCacheBypassed(req);
  assert.equal(result, false);
});

test("isMetricsCacheBypassed handles whitespace in refresh param", async () => {
  const { isMetricsCacheBypassed } = require("../src/lib/metrics-cache.js");
  const req = createMockNextRequest("http://localhost?refresh=%20true%20");
  const result = isMetricsCacheBypassed(req);
  assert.equal(result, true);
});

test("isMetricsCacheBypassed checks bypassCache param", async () => {
  const { isMetricsCacheBypassed } = require("../src/lib/metrics-cache.js");
  const req = createMockNextRequest("http://localhost?bypassCache=yes");
  const result = isMetricsCacheBypassed(req);
  assert.equal(result, true);
});