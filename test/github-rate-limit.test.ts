import { describe, it, expect } from "vitest";
import {
  GitHubRateLimitError,
  getGitHubRateLimitDetails,
  throwIfGitHubRateLimited,
  githubRateLimitResponse,
} from "../src/lib/github-rate-limit";

function makeResponse(status: number, headers: Record<string, string | null>): Response {
  return new Response(null, { status, headers } as any);
}

describe("github-rate-limit", () => {
  describe("GitHubRateLimitError", () => {
    it("creates error with correct details", () => {
      const details = {
        code: "GITHUB_RATE_LIMITED" as const,
        message: "Rate limit exceeded",
        resetAt: "2026-06-27T07:00:00.000Z",
        resetAtEpoch: 1751001600,
      };
      const err = new GitHubRateLimitError(details);
      expect(err.name).toBe("GitHubRateLimitError");
      expect(err.message).toBe("Rate limit exceeded");
      expect(err.details).toEqual(details);
    });
  });

  describe("getGitHubRateLimitDetails", () => {
    it("returns null when status is not 403 or 429", () => {
      const res = makeResponse(200, { "x-ratelimit-remaining": "0", "x-ratelimit-reset": "123" });
      expect(getGitHubRateLimitDetails(res)).toBeNull();
    });

    it("returns null when remaining is not 0", () => {
      const res = makeResponse(403, { "x-ratelimit-remaining": "10", "x-ratelimit-reset": "123" });
      expect(getGitHubRateLimitDetails(res)).toBeNull();
    });

    it("returns null when status is 403 but remaining is not 0", () => {
      const res = makeResponse(403, { "x-ratelimit-remaining": "1", "x-ratelimit-reset": "123" });
      expect(getGitHubRateLimitDetails(res)).toBeNull();
    });

    it("returns details for 403 with remaining=0", () => {
      const resetEpoch = 1782543600; // 2026-06-27T07:00:00Z
      const res = makeResponse(403, { "x-ratelimit-remaining": "0", "x-ratelimit-reset": String(resetEpoch) });
      const details = getGitHubRateLimitDetails(res);
      expect(details).not.toBeNull();
      expect(details!.code).toBe("GITHUB_RATE_LIMITED");
      expect(details!.resetAtEpoch).toBe(resetEpoch);
      expect(details!.resetAt).toBe("2026-06-27T07:00:00.000Z");
    });

    it("returns details for 429 with remaining=0", () => {
      const res = makeResponse(429, { "x-ratelimit-remaining": "0", "x-ratelimit-reset": "1751001600" });
      const details = getGitHubRateLimitDetails(res);
      expect(details).not.toBeNull();
      expect(details!.code).toBe("GITHUB_RATE_LIMITED");
    });

    it("handles missing reset header gracefully", () => {
      const res = makeResponse(403, { "x-ratelimit-remaining": "0", "x-ratelimit-reset": null });
      const details = getGitHubRateLimitDetails(res);
      expect(details).not.toBeNull();
      expect(details!.resetAtEpoch).toBeNull();
      expect(details!.resetAt).toBeNull();
      expect(details!.message).toContain("try again later");
    });
  });

  describe("throwIfGitHubRateLimited", () => {
    it("throws GitHubRateLimitError for rate-limited response", () => {
      const res = makeResponse(403, { "x-ratelimit-remaining": "0", "x-ratelimit-reset": "1751001600" });
      expect(() => throwIfGitHubRateLimited(res)).toThrow(GitHubRateLimitError);
    });

    it("does not throw for non-rate-limited response", () => {
      const res = makeResponse(200, { "x-ratelimit-remaining": "100", "x-ratelimit-reset": "1751001600" });
      expect(() => throwIfGitHubRateLimited(res)).not.toThrow();
    });
  });

  describe("githubRateLimitResponse", () => {
    it("returns null for non-GitHubRateLimitError", () => {
      expect(githubRateLimitResponse(new Error("other"))).toBeNull();
    });

    it("returns 429 Response with correct body for GitHubRateLimitError", () => {
      const err = new GitHubRateLimitError({
        code: "GITHUB_RATE_LIMITED",
        message: "Rate limit exceeded",
        resetAt: "2026-06-27T07:00:00.000Z",
        resetAtEpoch: 1751001600,
      });
      const res = githubRateLimitResponse(err);
      expect(res).not.toBeNull();
      expect(res!.status).toBe(429);
    });
  });
});
