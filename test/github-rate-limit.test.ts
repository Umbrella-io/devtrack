import {
  getGitHubRateLimitDetails,
  throwIfGitHubRateLimited,
  githubRateLimitResponse,
  GitHubRateLimitError,
} from "../src/lib/github-rate-limit";
import { describe, it, expect } from "vitest";

describe("github-rate-limit utility functions", () => {
  const createMockResponse = (status: number, headers: Record<string, string>) => {
    return {
      status,
      headers: {
        get: (name: string) => headers[name] ?? null,
      },
    } as Response;
  };

  describe("getGitHubRateLimitDetails", () => {
    it("should return null for non-rate-limited 200 response", () => {
      const response = createMockResponse(200, {
        "x-ratelimit-remaining": "4999",
      });
      expect(getGitHubRateLimitDetails(response)).toBeNull();
    });

    it("should return null for 403 if quota is not exhausted and no retry-after", () => {
      const response = createMockResponse(403, {
        "x-ratelimit-remaining": "100",
      });
      expect(getGitHubRateLimitDetails(response)).toBeNull();
    });

    it("should return details for 429 response regardless of remaining", () => {
      const response = createMockResponse(429, {
        "x-ratelimit-remaining": "100",
      });
      const details = getGitHubRateLimitDetails(response);
      expect(details).not.toBeNull();
      expect(details?.code).toBe("GITHUB_RATE_LIMITED");
    });

    it("should return details for 403 when remaining is 0", () => {
      const epoch = 1700000000;
      const response = createMockResponse(403, {
        "x-ratelimit-remaining": "0",
        "x-ratelimit-reset": epoch.toString(),
      });
      const details = getGitHubRateLimitDetails(response);
      expect(details).not.toBeNull();
      expect(details?.resetAtEpoch).toBe(epoch);
      expect(details?.resetAt).toBe(new Date(epoch * 1000).toISOString());
    });

    it("should return details for 403 when retry-after is present (secondary limit)", () => {
      const response = createMockResponse(403, {
        "x-ratelimit-remaining": "100",
        "retry-after": "60",
      });
      const details = getGitHubRateLimitDetails(response);
      expect(details).not.toBeNull();
      expect(details?.code).toBe("GITHUB_RATE_LIMITED");
    });

    it("should handle invalid or missing reset header gracefully", () => {
      const response = createMockResponse(429, {});
      const details = getGitHubRateLimitDetails(response);
      expect(details).not.toBeNull();
      expect(details?.resetAt).toBeNull();
      expect(details?.resetAtEpoch).toBeNull();
      expect(details?.message).toBe("GitHub API rate limit reached. Please try again later.");
    });
  });

  describe("throwIfGitHubRateLimited", () => {
    it("should throw GitHubRateLimitError for rate-limited response", () => {
      const response = createMockResponse(403, { "x-ratelimit-remaining": "0" });
      expect(() => throwIfGitHubRateLimited(response)).toThrow(GitHubRateLimitError);
    });

    it("should not throw for non-rate-limited response", () => {
      const response = createMockResponse(200, {});
      expect(() => throwIfGitHubRateLimited(response)).not.toThrow();
    });
  });

  describe("githubRateLimitResponse", () => {
    it("should return null for non-GitHubRateLimitError", () => {
      expect(githubRateLimitResponse(new Error("Standard error"))).toBeNull();
    });

    it("should return 429 Response with correct JSON for GitHubRateLimitError", async () => {
      const details = {
        code: "GITHUB_RATE_LIMITED" as const,
        message: "Limit reached",
        resetAt: "2024-01-01T00:00:00.000Z",
        resetAtEpoch: 1704067200,
      };
      const error = new GitHubRateLimitError(details);
      
      const response = githubRateLimitResponse(error);
      expect(response).not.toBeNull();
      expect(response?.status).toBe(429);
      
      if (response) {
        const json = await response.json();
        expect(json).toEqual({
          error: details.code,
          message: details.message,
          rateLimit: {
            resetAt: details.resetAt,
            resetAtEpoch: details.resetAtEpoch,
          },
        });
      }
    });
  });
});
