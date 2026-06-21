import { describe, it, expect } from "vitest";
import {
  getGitHubRateLimitDetails,
  throwIfGitHubRateLimited,
  githubRateLimitResponse,
  GitHubRateLimitError,
} from "../src/lib/github-rate-limit";

function makeMockResponse(status: number, headers: Record<string, string | null>): Response {
  return new Response(null, { status, headers: headers as Record<string, string> }) as Response & {
    headers: Map<string, string> & { get(name: string): string | null };
  };
}

describe("getGitHubRateLimitDetails", () => {
  it("returns null when status is not 403 or 429", () => {
    const res = makeMockResponse(200, {});
    expect(getGitHubRateLimitDetails(res)).toBeNull();
  });

  it("returns null for 403 with remaining quota and no retry-after", () => {
    const res = makeMockResponse(403, { "x-ratelimit-remaining": "100" });
    expect(getGitHubRateLimitDetails(res)).toBeNull();
  });

  it("returns null for 403 with no remaining header and no retry-after", () => {
    const res = makeMockResponse(403, { "x-ratelimit-remaining": null });
    expect(getGitHubRateLimitDetails(res)).toBeNull();
  });

  it("returns null for status 200 even with x-ratelimit-remaining 0", () => {
    const res = makeMockResponse(200, { "x-ratelimit-remaining": "0" });
    expect(getGitHubRateLimitDetails(res)).toBeNull();
  });

  it("returns details for 403 when quota is exhausted", () => {
    // 1750540800 = 2025-06-21 21:20:00 UTC
    const res = makeMockResponse(403, {
      "x-ratelimit-remaining": "0",
      "x-ratelimit-reset": "1750540800",
    });
    const details = getGitHubRateLimitDetails(res);
    expect(details).not.toBeNull();
    expect(details!.code).toBe("GITHUB_RATE_LIMITED");
    expect(details!.resetAt).toBe("2025-06-21T21:20:00.000Z");
    expect(details!.resetAtEpoch).toBe(1750540800);
  });

  it("returns details for 429 regardless of remaining quota", () => {
    const res = makeMockResponse(429, {
      "x-ratelimit-remaining": "50",
      "x-ratelimit-reset": "1750540800",
    });
    const details = getGitHubRateLimitDetails(res);
    expect(details).not.toBeNull();
    expect(details!.code).toBe("GITHUB_RATE_LIMITED");
    expect(details!.resetAtEpoch).toBe(1750540800);
  });

  it("returns details for 429 even with no reset header", () => {
    const res = makeMockResponse(429, { "x-ratelimit-remaining": "0" });
    const details = getGitHubRateLimitDetails(res);
    expect(details).not.toBeNull();
    expect(details!.resetAt).toBeNull();
    expect(details!.resetAtEpoch).toBeNull();
    expect(details!.message).toContain("rate limit reached");
  });

  it("returns details with null resetAtEpoch when reset header is non-numeric", () => {
    const res = makeMockResponse(429, {
      "x-ratelimit-remaining": "0",
      "x-ratelimit-reset": "not-a-number",
    });
    const details = getGitHubRateLimitDetails(res);
    expect(details).not.toBeNull();
    expect(details!.resetAtEpoch).toBeNull();
    expect(details!.resetAt).toBeNull();
  });

  it("returns details for 403 with retry-after header even without remaining header", () => {
    const res = makeMockResponse(403, { "retry-after": "60" });
    const details = getGitHubRateLimitDetails(res);
    expect(details).not.toBeNull();
    expect(details!.code).toBe("GITHUB_RATE_LIMITED");
  });
});

describe("throwIfGitHubRateLimited", () => {
  it("does not throw for 200 responses", () => {
    const res = makeMockResponse(200, {});
    expect(() => throwIfGitHubRateLimited(res)).not.toThrow();
  });

  it("does not throw for 403 with remaining quota and no retry-after", () => {
    const res = makeMockResponse(403, { "x-ratelimit-remaining": "100" });
    expect(() => throwIfGitHubRateLimited(res)).not.toThrow();
  });

  it("throws GitHubRateLimitError for 403 with exhausted quota", () => {
    const res = makeMockResponse(403, {
      "x-ratelimit-remaining": "0",
      "x-ratelimit-reset": "1750540800",
    });
    expect(() => throwIfGitHubRateLimited(res)).toThrow(GitHubRateLimitError);
  });

  it("throws GitHubRateLimitError for 429 regardless of quota", () => {
    const res = makeMockResponse(429, {
      "x-ratelimit-remaining": "999",
    });
    expect(() => throwIfGitHubRateLimited(res)).toThrow(GitHubRateLimitError);
  });

  it("thrown error contains correct resetAtEpoch", () => {
    const res = makeMockResponse(429, {
      "x-ratelimit-remaining": "0",
      "x-ratelimit-reset": "1750540800",
    });
    try {
      throwIfGitHubRateLimited(res);
    } catch (err) {
      expect(err).toBeInstanceOf(GitHubRateLimitError);
      const rlErr = err as GitHubRateLimitError;
      expect(rlErr.details.code).toBe("GITHUB_RATE_LIMITED");
      expect(rlErr.details.resetAtEpoch).toBe(1750540800);
    }
  });
});

describe("githubRateLimitResponse", () => {
  it("returns null for non-rate-limit errors", () => {
    expect(githubRateLimitResponse(new Error("something else"))).toBeNull();
  });

  it("returns null for null input", () => {
    // @ts-ignore - intentionally passing null to test defensive behaviour
    expect(githubRateLimitResponse(null)).toBeNull();
  });

  it("returns a Response with status 429 for GitHubRateLimitError", async () => {
    const err = new GitHubRateLimitError({
      code: "GITHUB_RATE_LIMITED",
      message: "GitHub API rate limit reached.",
      resetAt: "2025-06-21T21:20:00.000Z",
      resetAtEpoch: 1750540800,
    });
    const response = githubRateLimitResponse(err);
    expect(response).not.toBeNull();
    expect(response!.status).toBe(429);

    const body = await response!.json();
    expect(body.error).toBe("GITHUB_RATE_LIMITED");
    expect(body.message).toBe("GitHub API rate limit reached.");
    expect(body.rateLimit.resetAt).toBe("2025-06-21T21:20:00.000Z");
    expect(body.rateLimit.resetAtEpoch).toBe(1750540800);
  });

  it("handles error with null resetAt", async () => {
    const err = new GitHubRateLimitError({
      code: "GITHUB_RATE_LIMITED",
      message: "Rate limit reached.",
      resetAt: null,
      resetAtEpoch: null,
    });
    const response = githubRateLimitResponse(err);
    expect(response).not.toBeNull();
    expect(response!.status).toBe(429);

    const body = await response!.json();
    expect(body.rateLimit.resetAt).toBeNull();
    expect(body.rateLimit.resetAtEpoch).toBeNull();
  });
});
