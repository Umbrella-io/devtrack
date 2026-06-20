import { describe, it, expect } from "vitest";
import {
  getGitHubRateLimitDetails,
  throwIfGitHubRateLimited,
  githubRateLimitResponse,
  GitHubRateLimitError,
} from "../src/lib/github-rate-limit";

function makeResponse(
  status: number,
  headers: Record<string, string> = {},
): Pick<Response, "status" | "headers"> {
  const headerMap = new Map(Object.entries(headers));
  return {
    status,
    headers: {
      get: (name: string) => headerMap.get(name) ?? null,
    },
  } as Pick<Response, "status" | "headers">;
}

describe("github-rate-limit", () => {
  describe("getGitHubRateLimitDetails", () => {
    it("returns null for a 200 OK response", () => {
      expect(getGitHubRateLimitDetails(makeResponse(200))).toBeNull();
    });

    it("returns null for a 201 Created response", () => {
      expect(getGitHubRateLimitDetails(makeResponse(201))).toBeNull();
    });

    it("returns null for a 400 Bad Request response", () => {
      expect(getGitHubRateLimitDetails(makeResponse(400))).toBeNull();
    });

    it("returns null for a 401 Unauthorized response", () => {
      expect(getGitHubRateLimitDetails(makeResponse(401))).toBeNull();
    });

    it("returns rate limit details for a 429 Too Many Requests response", () => {
      const resetEpoch = "1735689600";
      const response = makeResponse(429, {
        "x-ratelimit-reset": resetEpoch,
        "x-ratelimit-remaining": "0",
      });
      const details = getGitHubRateLimitDetails(response);
      expect(details).not.toBeNull();
      expect(details!.code).toBe("GITHUB_RATE_LIMITED");
      expect(details!.resetAtEpoch).toBe(1735689600);
      expect(details!.resetAt).toBe(new Date(1735689600 * 1000).toISOString());
    });

    it("detects 403 rate limiting when x-ratelimit-remaining is 0", () => {
      const response = makeResponse(403, {
        "x-ratelimit-remaining": "0",
        "x-ratelimit-reset": "1735689600",
      });
      const details = getGitHubRateLimitDetails(response);
      expect(details).not.toBeNull();
      expect(details!.code).toBe("GITHUB_RATE_LIMITED");
    });

    it("detects 403 rate limiting when retry-after header is present", () => {
      const response = makeResponse(403, {
        "retry-after": "60",
      });
      const details = getGitHubRateLimitDetails(response);
      expect(details).not.toBeNull();
      expect(details!.code).toBe("GITHUB_RATE_LIMITED");
    });

    it("returns null for 403 without rate limit signals", () => {
      const response = makeResponse(403, {
        "x-ratelimit-remaining": "100",
      });
      expect(getGitHubRateLimitDetails(response)).toBeNull();
    });

    it("computes resetAt correctly from epoch timestamp", () => {
      const resetEpoch = "1735689600";
      const response = makeResponse(429, {
        "x-ratelimit-reset": resetEpoch,
      });
      const details = getGitHubRateLimitDetails(response);
      expect(details!.resetAt).toBe("2025-01-01T00:00:00.000Z");
    });

    it("sets resetAt to null when x-ratelimit-reset is missing", () => {
      const response = makeResponse(429, {});
      const details = getGitHubRateLimitDetails(response);
      expect(details).not.toBeNull();
      expect(details!.resetAt).toBeNull();
      expect(details!.resetAtEpoch).toBeNull();
    });

    it("includes a user-friendly message when resetAt is available", () => {
      const response = makeResponse(429, {
        "x-ratelimit-reset": "1735689600",
      });
      const details = getGitHubRateLimitDetails(response);
      expect(details!.message).toContain("GitHub API rate limit reached");
      expect(details!.message).toContain("2025-01-01T00:00:00");
    });

    it("includes a fallback message when resetAt is not available", () => {
      const response = makeResponse(429, {});
      const details = getGitHubRateLimitDetails(response);
      expect(details!.message).toContain("Please try again later");
    });
  });

  describe("throwIfGitHubRateLimited", () => {
    it("does not throw for a non-rate-limited response", () => {
      const response = makeResponse(200);
      expect(() => throwIfGitHubRateLimited(response as Response)).not.toThrow();
    });

    it("throws GitHubRateLimitError for a 429 response", () => {
      const response = makeResponse(429, {
        "x-ratelimit-reset": "1735689600",
      }) as Response;
      expect(() => throwIfGitHubRateLimited(response)).toThrow(GitHubRateLimitError);
    });

    it("throws GitHubRateLimitError for a 403 rate-limited response", () => {
      const response = makeResponse(403, {
        "x-ratelimit-remaining": "0",
        "x-ratelimit-reset": "1735689600",
      }) as Response;
      expect(() => throwIfGitHubRateLimited(response)).toThrow(GitHubRateLimitError);
    });

    it("the thrown error contains correct rate limit details", () => {
      const response = makeResponse(429, {
        "x-ratelimit-reset": "1735689600",
      }) as Response;
      try {
        throwIfGitHubRateLimited(response);
      } catch (e) {
        expect(e).toBeInstanceOf(GitHubRateLimitError);
        const error = e as GitHubRateLimitError;
        expect(error.details.code).toBe("GITHUB_RATE_LIMITED");
        expect(error.details.resetAtEpoch).toBe(1735689600);
      }
    });
  });

  describe("githubRateLimitResponse", () => {
    it("returns null for a non-GitHubRateLimitError input", () => {
      expect(githubRateLimitResponse(new Error("generic"))).toBeNull();
      expect(githubRateLimitResponse(null)).toBeNull();
      expect(githubRateLimitResponse(undefined)).toBeNull();
    });

    it("returns a 429 Response for a GitHubRateLimitError", () => {
      const error = new GitHubRateLimitError({
        code: "GITHUB_RATE_LIMITED",
        message: "Rate limit reached",
        resetAt: "2025-01-01T00:00:00.000Z",
        resetAtEpoch: 1735689600,
      });
      const response = githubRateLimitResponse(error);
      expect(response).not.toBeNull();
      expect(response!.status).toBe(429);
    });

    it("Response body contains error code and message", () => {
      const error = new GitHubRateLimitError({
        code: "GITHUB_RATE_LIMITED",
        message: "Rate limit reached",
        resetAt: "2025-01-01T00:00:00.000Z",
        resetAtEpoch: 1735689600,
      });
      const response = githubRateLimitResponse(error);
      expect(response).not.toBeNull();
      expect(response!.status).toBe(429);
    });
  });

  describe("GitHubRateLimitError", () => {
    it("is an instance of Error", () => {
      const error = new GitHubRateLimitError({
        code: "GITHUB_RATE_LIMITED",
        message: "Rate limit reached",
        resetAt: null,
        resetAtEpoch: null,
      });
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe("GitHubRateLimitError");
      expect(error.message).toBe("Rate limit reached");
    });

    it("contains the rate limit details", () => {
      const details = {
        code: "GITHUB_RATE_LIMITED" as const,
        message: "Rate limit reached",
        resetAt: "2025-01-01T00:00:00.000Z",
        resetAtEpoch: 1735689600,
      };
      const error = new GitHubRateLimitError(details);
      expect(error.details).toEqual(details);
    });
  });
});
