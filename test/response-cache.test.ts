import { describe, it, expect } from "vitest";
import { privateCacheHeaders, publicCacheHeaders } from "../src/lib/response-cache";

// ─── privateCacheHeaders ──────────────────────────────────────────────────────

describe("privateCacheHeaders", () => {
  // ── default values ───────────────────────────────────────────────────────

  it("returns correct headers with default values", () => {
    const headers = privateCacheHeaders();
    expect(headers["Cache-Control"]).toBe("private, max-age=300, stale-while-revalidate=600");
  });

  it("returns correct headers with custom maxAgeSeconds", () => {
    const headers = privateCacheHeaders(600);
    expect(headers["Cache-Control"]).toBe("private, max-age=600, stale-while-revalidate=1200");
  });

  it("returns correct headers with custom swrSeconds", () => {
    const headers = privateCacheHeaders(300, 900);
    expect(headers["Cache-Control"]).toBe("private, max-age=300, stale-while-revalidate=900");
  });

  it("returns correct headers with zero values", () => {
    const headers = privateCacheHeaders(0, 0);
    expect(headers["Cache-Control"]).toBe("private, max-age=0, stale-while-revalidate=0");
  });

  // ── SWR default formula ──────────────────────────────────────────────────

  it("defaults stale-while-revalidate to exactly 2× maxAgeSeconds", () => {
    expect(privateCacheHeaders(100)["Cache-Control"]).toBe(
      "private, max-age=100, stale-while-revalidate=200"
    );
  });

  it("applies the 2× SWR default correctly for a 1-hour max-age", () => {
    expect(privateCacheHeaders(3600)["Cache-Control"]).toBe(
      "private, max-age=3600, stale-while-revalidate=7200"
    );
  });

  // ── directive presence ───────────────────────────────────────────────────

  it("always includes the private directive", () => {
    expect(privateCacheHeaders()["Cache-Control"]).toMatch(/\bprivate\b/);
    expect(privateCacheHeaders(0, 0)["Cache-Control"]).toMatch(/\bprivate\b/);
  });

  it("never includes s-maxage — private responses must not be CDN-cached", () => {
    expect(privateCacheHeaders()["Cache-Control"]).not.toContain("s-maxage");
    expect(privateCacheHeaders(600)["Cache-Control"]).not.toContain("s-maxage");
    expect(privateCacheHeaders(0, 0)["Cache-Control"]).not.toContain("s-maxage");
  });

  it("never includes the public directive", () => {
    expect(privateCacheHeaders()["Cache-Control"]).not.toContain("public");
    expect(privateCacheHeaders(600)["Cache-Control"]).not.toContain("public");
  });

  it("includes stale-while-revalidate directive", () => {
    expect(privateCacheHeaders()["Cache-Control"]).toContain("stale-while-revalidate=");
  });

  // ── directive format ─────────────────────────────────────────────────────

  it("uses comma-space as directive separator — exact format", () => {
    const value = privateCacheHeaders(300)["Cache-Control"];
    expect(value).toMatch(/^private, max-age=\d+, stale-while-revalidate=\d+$/);
  });

  it("uses = not : to assign directive values", () => {
    const value = privateCacheHeaders(300)["Cache-Control"];
    expect(value).toContain("max-age=300");
    expect(value).toContain("stale-while-revalidate=600");
    expect(value).not.toContain("max-age:300");
    expect(value).not.toContain("stale-while-revalidate:600");
  });

  it("directive keyword is stale-while-revalidate, not an abbreviation", () => {
    const value = privateCacheHeaders()["Cache-Control"];
    expect(value).toContain("stale-while-revalidate=");
    expect(value).not.toContain("swr=");
    expect(value).not.toContain("stale-revalidate=");
  });

  // ── return object shape ──────────────────────────────────────────────────

  it("returns an object with exactly one key: Cache-Control", () => {
    const headers = privateCacheHeaders();
    expect(Object.keys(headers)).toHaveLength(1);
    expect(Object.keys(headers)).toEqual(["Cache-Control"]);
  });

  it("Cache-Control value is a string", () => {
    expect(typeof privateCacheHeaders()["Cache-Control"]).toBe("string");
  });

  // ── large / boundary values ──────────────────────────────────────────────

  it("handles a 24-hour max-age correctly", () => {
    expect(privateCacheHeaders(86400)["Cache-Control"]).toBe(
      "private, max-age=86400, stale-while-revalidate=172800"
    );
  });

  it("allows an explicit swrSeconds of 0 independent of maxAgeSeconds", () => {
    expect(privateCacheHeaders(300, 0)["Cache-Control"]).toBe(
      "private, max-age=300, stale-while-revalidate=0"
    );
  });

  // ── Headers constructor compatibility ────────────────────────────────────

  it("returned object is valid HeadersInit for the Headers constructor", () => {
    const init = privateCacheHeaders(300);
    expect(() => new Headers(init as HeadersInit)).not.toThrow();
    const h = new Headers(init as HeadersInit);
    expect(h.get("Cache-Control")).toBe("private, max-age=300, stale-while-revalidate=600");
  });
});

// ─── publicCacheHeaders ───────────────────────────────────────────────────────

describe("publicCacheHeaders", () => {
  // ── default values ───────────────────────────────────────────────────────

  it("returns correct headers with default values", () => {
    const headers = publicCacheHeaders();
    expect(headers["Cache-Control"]).toBe("public, s-maxage=300, stale-while-revalidate=600");
  });

  it("returns correct headers with custom maxAgeSeconds", () => {
    const headers = publicCacheHeaders(600);
    expect(headers["Cache-Control"]).toBe("public, s-maxage=600, stale-while-revalidate=1200");
  });

  it("returns correct headers with custom swrSeconds", () => {
    const headers = publicCacheHeaders(300, 900);
    expect(headers["Cache-Control"]).toBe("public, s-maxage=300, stale-while-revalidate=900");
  });

  it("returns correct headers with zero values", () => {
    const headers = publicCacheHeaders(0, 0);
    expect(headers["Cache-Control"]).toBe("public, s-maxage=0, stale-while-revalidate=0");
  });

  it("includes s-maxage for public caching", () => {
    const headers = publicCacheHeaders();
    expect(headers["Cache-Control"]).toContain("s-maxage=");
    expect(headers["Cache-Control"]).not.toContain("private");
  });

  it("does not include private for public caching", () => {
    const headers = publicCacheHeaders();
    expect(headers["Cache-Control"]).not.toContain("private");
  });

  // ── SWR default formula ──────────────────────────────────────────────────

  it("defaults stale-while-revalidate to exactly 2× maxAgeSeconds", () => {
    expect(publicCacheHeaders(100)["Cache-Control"]).toBe(
      "public, s-maxage=100, stale-while-revalidate=200"
    );
  });

  it("applies the 2× SWR default correctly for a 1-hour s-maxage", () => {
    expect(publicCacheHeaders(3600)["Cache-Control"]).toBe(
      "public, s-maxage=3600, stale-while-revalidate=7200"
    );
  });

  // ── directive presence ───────────────────────────────────────────────────

  it("always includes the public directive", () => {
    expect(publicCacheHeaders()["Cache-Control"]).toMatch(/\bpublic\b/);
    expect(publicCacheHeaders(0, 0)["Cache-Control"]).toMatch(/\bpublic\b/);
  });

  it("always includes s-maxage — required for CDN caching", () => {
    expect(publicCacheHeaders()["Cache-Control"]).toContain("s-maxage=");
    expect(publicCacheHeaders(600)["Cache-Control"]).toContain("s-maxage=");
    expect(publicCacheHeaders(0, 0)["Cache-Control"]).toContain("s-maxage=");
  });

  it("never includes standalone max-age (only s-maxage is used for public responses)", () => {
    const value = publicCacheHeaders()["Cache-Control"];
    // s-maxage= is present but `, max-age=` (standalone directive) must not be
    expect(value).not.toContain(", max-age=");
  });

  it("never includes the private directive", () => {
    expect(publicCacheHeaders()["Cache-Control"]).not.toContain("private");
    expect(publicCacheHeaders(600)["Cache-Control"]).not.toContain("private");
  });

  it("includes stale-while-revalidate directive", () => {
    expect(publicCacheHeaders()["Cache-Control"]).toContain("stale-while-revalidate=");
  });

  // ── directive format ─────────────────────────────────────────────────────

  it("uses comma-space as directive separator — exact format", () => {
    const value = publicCacheHeaders(300)["Cache-Control"];
    expect(value).toMatch(/^public, s-maxage=\d+, stale-while-revalidate=\d+$/);
  });

  it("uses = not : to assign directive values", () => {
    const value = publicCacheHeaders(300)["Cache-Control"];
    expect(value).toContain("s-maxage=300");
    expect(value).toContain("stale-while-revalidate=600");
    expect(value).not.toContain("s-maxage:300");
    expect(value).not.toContain("stale-while-revalidate:600");
  });

  it("directive keyword is stale-while-revalidate, not an abbreviation", () => {
    const value = publicCacheHeaders()["Cache-Control"];
    expect(value).toContain("stale-while-revalidate=");
    expect(value).not.toContain("swr=");
    expect(value).not.toContain("stale-revalidate=");
  });

  // ── return object shape ──────────────────────────────────────────────────

  it("returns an object with exactly one key: Cache-Control", () => {
    const headers = publicCacheHeaders();
    expect(Object.keys(headers)).toHaveLength(1);
    expect(Object.keys(headers)).toEqual(["Cache-Control"]);
  });

  it("Cache-Control value is a string", () => {
    expect(typeof publicCacheHeaders()["Cache-Control"]).toBe("string");
  });

  // ── large / boundary values ──────────────────────────────────────────────

  it("handles a 24-hour s-maxage correctly", () => {
    expect(publicCacheHeaders(86400)["Cache-Control"]).toBe(
      "public, s-maxage=86400, stale-while-revalidate=172800"
    );
  });

  it("allows an explicit swrSeconds of 0 independent of maxAgeSeconds", () => {
    expect(publicCacheHeaders(300, 0)["Cache-Control"]).toBe(
      "public, s-maxage=300, stale-while-revalidate=0"
    );
  });

  // ── Headers constructor compatibility ────────────────────────────────────

  it("returned object is valid HeadersInit for the Headers constructor", () => {
    const init = publicCacheHeaders(300);
    expect(() => new Headers(init as HeadersInit)).not.toThrow();
    const h = new Headers(init as HeadersInit);
    expect(h.get("Cache-Control")).toBe("public, s-maxage=300, stale-while-revalidate=600");
  });
});

// ─── cross-function regression ────────────────────────────────────────────────

describe("cache header regression", () => {
  it("privateCacheHeaders and publicCacheHeaders produce distinct headers for the same input", () => {
    const priv = privateCacheHeaders(300)["Cache-Control"];
    const pub = publicCacheHeaders(300)["Cache-Control"];
    expect(priv).not.toBe(pub);
  });

  it("privateCacheHeaders uses max-age while publicCacheHeaders uses s-maxage", () => {
    const privValue = privateCacheHeaders(300)["Cache-Control"];
    const pubValue = publicCacheHeaders(300)["Cache-Control"];

    expect(privValue).toContain(", max-age=300");
    expect(privValue).not.toContain("s-maxage=");

    expect(pubValue).toContain("s-maxage=300");
    expect(pubValue).not.toContain(", max-age=");
  });

  it("private/public directives are mutually exclusive between the two functions", () => {
    expect(privateCacheHeaders()["Cache-Control"]).toContain("private");
    expect(privateCacheHeaders()["Cache-Control"]).not.toContain("public");

    expect(publicCacheHeaders()["Cache-Control"]).toContain("public");
    expect(publicCacheHeaders()["Cache-Control"]).not.toContain("private");
  });

  it("both functions expose a stale-while-revalidate directive", () => {
    expect(privateCacheHeaders()["Cache-Control"]).toContain("stale-while-revalidate=");
    expect(publicCacheHeaders()["Cache-Control"]).toContain("stale-while-revalidate=");
  });

  it("default SWR window is double the age directive for both functions", () => {
    const maxAge = 150;
    const expectedSwr = maxAge * 2; // 300
    expect(privateCacheHeaders(maxAge)["Cache-Control"]).toContain(
      `stale-while-revalidate=${expectedSwr}`
    );
    expect(publicCacheHeaders(maxAge)["Cache-Control"]).toContain(
      `stale-while-revalidate=${expectedSwr}`
    );
  });

  it("header key is exactly Cache-Control — correct capitalisation and hyphen", () => {
    const priv = privateCacheHeaders();
    const pub = publicCacheHeaders();

    expect(priv).toHaveProperty("Cache-Control");
    expect(pub).toHaveProperty("Cache-Control");

    // Wrong casing must not silently appear
    expect(priv).not.toHaveProperty("cache-control");
    expect(pub).not.toHaveProperty("cache-control");
    expect(priv).not.toHaveProperty("CacheControl");
    expect(pub).not.toHaveProperty("CacheControl");
  });

  it("directive ordering is stable: visibility, age, revalidation", () => {
    // privateCacheHeaders: private → max-age → stale-while-revalidate
    const privValue = privateCacheHeaders(60)["Cache-Control"];
    const privParts = privValue.split(", ");
    expect(privParts[0]).toBe("private");
    expect(privParts[1]).toMatch(/^max-age=/);
    expect(privParts[2]).toMatch(/^stale-while-revalidate=/);

    // publicCacheHeaders: public → s-maxage → stale-while-revalidate
    const pubValue = publicCacheHeaders(60)["Cache-Control"];
    const pubParts = pubValue.split(", ");
    expect(pubParts[0]).toBe("public");
    expect(pubParts[1]).toMatch(/^s-maxage=/);
    expect(pubParts[2]).toMatch(/^stale-while-revalidate=/);
  });

  it("both functions return exactly three directives", () => {
    const privParts = privateCacheHeaders(300)["Cache-Control"].split(", ");
    const pubParts = publicCacheHeaders(300)["Cache-Control"].split(", ");
    expect(privParts).toHaveLength(3);
    expect(pubParts).toHaveLength(3);
  });
});
