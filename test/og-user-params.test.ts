import { describe, it, expect } from "vitest";
import { normalizeOgUserParams } from "../src/lib/og-user-params";

function makeParams(p: Record<string, string | null>): URLSearchParams {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) {
    if (v !== null) sp.set(k, v);
  }
  return sp;
}

describe("og-user-params", () => {
  describe("normalizeOgUserParams", () => {
    it("trims username and validates it (normalizeGitHubUsername does not lowercase)", () => {
      // normalizeGitHubUsername trims and validates, it does NOT lowercase
      const result = normalizeOgUserParams(makeParams({ username: "  TestUser  " }));
      expect(result.username).toBe("TestUser");
    });

    it("normalises name and respects max length of 48", () => {
      const longName = "a".repeat(60);
      const result = normalizeOgUserParams(makeParams({ name: longName, username: "u" }));
      expect(result.name.length).toBe(48);
      expect(result.name).toBe("a".repeat(48));
    });

    it("uses username as name fallback when name is missing", () => {
      const result = normalizeOgUserParams(makeParams({ username: "testuser" }));
      expect(result.name).toBe("testuser");
    });

    it("normalises topLang and respects max length of 24", () => {
      const longLang = "x".repeat(30);
      const result = normalizeOgUserParams(makeParams({ topLang: longLang, username: "u" }));
      expect(result.topLang.length).toBe(24);
    });

    it("defaults topLang to JavaScript when missing", () => {
      const result = normalizeOgUserParams(makeParams({ username: "u" }));
      expect(result.topLang).toBe("JavaScript");
    });

    it("constructs correct avatar URL", () => {
      const result = normalizeOgUserParams(makeParams({ username: "testuser" }));
      expect(result.avatar).toBe("https://github.com/testuser.png?size=200");
    });

    it("normalises streak to non-negative integer", () => {
      const result = normalizeOgUserParams(makeParams({ username: "u", streak: "42" }));
      expect(result.streak).toBe(42);
    });

    it("clamps streak to max 999999", () => {
      const result = normalizeOgUserParams(makeParams({ username: "u", streak: "2000000" }));
      expect(result.streak).toBe(999999);
    });

    it("returns 0 for invalid streak values", () => {
      const r1 = normalizeOgUserParams(makeParams({ username: "u", streak: "-5" }));
      expect(r1.streak).toBe(0);
      const r2 = normalizeOgUserParams(makeParams({ username: "u", streak: "abc" }));
      expect(r2.streak).toBe(0);
      const r3 = normalizeOgUserParams(makeParams({ username: "u", streak: "" }));
      expect(r3.streak).toBe(0);
    });

    it("normalises commits to non-negative integer", () => {
      const result = normalizeOgUserParams(makeParams({ username: "u", commits: "123" }));
      expect(result.commits).toBe(123);
    });

    it("clamps commits to max 999999", () => {
      const result = normalizeOgUserParams(makeParams({ username: "u", commits: "9999999" }));
      expect(result.commits).toBe(999999);
    });

    it("returns 0 for invalid commits values", () => {
      const r1 = normalizeOgUserParams(makeParams({ username: "u", commits: "nan" }));
      expect(r1.commits).toBe(0);
      const r2 = normalizeOgUserParams(makeParams({ username: "u", commits: "" }));
      expect(r2.commits).toBe(0);
    });

    it("handles all parameters together", () => {
      const result = normalizeOgUserParams(
        makeParams({ username: "Alice", name: "Alice Smith", topLang: "TypeScript", streak: "10", commits: "500" })
      );
      expect(result.username).toBe("Alice"); // normalizeGitHubUsername trims/validates, does not lowercase
      expect(result.name).toBe("Alice Smith");
      expect(result.topLang).toBe("TypeScript");
      expect(result.streak).toBe(10);
      expect(result.commits).toBe(500);
      expect(result.avatar).toBe("https://github.com/Alice.png?size=200");
    });
  });
});
