import { describe, it, expect } from "vitest";
import {
  getGitHubRateLimitDetails,
  throwIfGitHubRateLimited,
  githubRateLimitResponse,
  GitHubRateLimitError,
} from "../src/lib/github-rate-limit";

function makeResponse(overrides: {
  status?: number;
  headers?: Record<string, string>;
}): Pick<Response, "status" | "headers"> {
  const headers = new Map(Object.entries(overrides.headers ?? {}));
  return {
    status: overrides.status ?? 200,
    headers: {
      get: (name: string) => headers.get(name) ?? null,
    },
  } as Pick<Response, "status" | "headers">;
}

describe("getGitHubRateLimitDetails", () => {

  it("returns null when status is 200", () => {
    const res = makeResponse({ status: 200, headers: { "x-ratelimit-remaining": "0" } });
    expect(getGitHubRateLimitDetails(res)).toBeNull();
  });

  it("returns null when status is 403 but remaining is not 0", () => {
    const res = makeResponse({ status: 403, headers: { "x-ratelimit-remaining": "100" } });
    expect(getGitHubRateLimitDetails(res)).toBeNull();
  });

  it("returns null when remaining header is missing and no retry-after on 403", () => {
    const res = makeResponse({ status: 403 });
    expect(getGitHubRateLimitDetails(res)).toBeNull();
  });

  it("returns details when status is 429 regardless of remaining (429 is always rate limited)", () => {
    const res = makeResponse({ status: 429, headers: { "x-ratelimit-remaining": "50" } });
    const details = getGitHubRateLimitDetails(res);
    expect(details).not.toBeNull();
    expect(details!.code).toBe("GITHUB_RATE_LIMITED");
  });

  it("returns details when status is 403 and remaining is 0", () => {
    const res = makeResponse({
      status: 403,
      headers: { "x-ratelimit-remaining": "0", "x-ratelimit-reset": "1750137600" },
    });
    const details = getGitHubRateLimitDetails(res);
    expect(details).not.toBeNull();
    expect(details!.code).toBe("GITHUB_RATE_LIMITED");
    expect(details!.resetAtEpoch).toBe(1750137600);
    expect(details!.resetAt).toBe(new Date(1750137600 * 1000).toISOString());
  });

  it("returns details when status is 429 and remaining is 0", () => {
    const res = makeResponse({
      status: 429,
      headers: { "x-ratelimit-remaining": "0" },
    });
    const details = getGitHubRateLimitDetails(res);
    expect(details).not.toBeNull();
    expect(details!.code).toBe("GITHUB_RATE_LIMITED");
  });

  it("returns details when 403 has retry-after header (secondary rate limit)", () => {
    const res = makeResponse({ status: 403, headers: { "retry-after": "60" } });
    const details = getGitHubRateLimitDetails(res);
    expect(details).not.toBeNull();
    expect(details!.code).toBe("GITHUB_RATE_LIMITED");
  });

  it("handles missing x-ratelimit-reset header", () => {
    const res = makeResponse({ status: 403, headers: { "x-ratelimit-remaining": "0" } });
    const details = getGitHubRateLimitDetails(res);
    expect(details).not.toBeNull();
    expect(details!.resetAt).toBeNull();
    expect(details!.resetAtEpoch).toBeNull();
    expect(details!.message).toBe("GitHub API rate limit reached. Please try again later.");
  });

  it("handles invalid x-ratelimit-reset header", () => {
    const res = makeResponse({
      status: 403,
      headers: { "x-ratelimit-remaining": "0", "x-ratelimit-reset": "not-a-number" },
    });
    const details = getGitHubRateLimitDetails(res);
    expect(details).not.toBeNull();
    expect(details!.resetAt).toBeNull();
    expect(details!.resetAtEpoch).toBeNull();
    expect(details!.message).toBe("GitHub API rate limit reached. Please try again later.");
  });

  it("message includes reset time when resetAt is known", () => {
    const res = makeResponse({
      status: 403,
      headers: { "x-ratelimit-remaining": "0", "x-ratelimit-reset": "1750137600" },
    });
    const details = getGitHubRateLimitDetails(res);
    expect(details!.message).toContain(new Date(1750137600 * 1000).toISOString());
  });

});

describe("throwIfGitHubRateLimited", () => {

  it("does not throw when not rate limited", () => {
    const res = makeResponse({ status: 200 });
    expect(() => throwIfGitHubRateLimited(res as Response)).not.toThrow();
  });

  it("throws GitHubRateLimitError when rate limited", () => {
    const res = makeResponse({
      status: 403,
      headers: { "x-ratelimit-remaining": "0" },
    }) as Response;
    expect(() => throwIfGitHubRateLimited(res)).toThrow(GitHubRateLimitError);
  });

  it("thrown error contains correct details", () => {
    const res = makeResponse({
      status: 403,
      headers: { "x-ratelimit-remaining": "0", "x-ratelimit-reset": "1750137600" },
    }) as Response;
    try {
      throwIfGitHubRateLimited(res);
    } catch (err) {
      expect(err).toBeInstanceOf(GitHubRateLimitError);
      expect((err as GitHubRateLimitError).details.code).toBe("GITHUB_RATE_LIMITED");
    }
  });

});

describe("githubRateLimitResponse", () => {

  it("returns null for non-GitHubRateLimitError", () => {
    expect(githubRateLimitResponse(new Error("some error"))).toBeNull();
  });

  it("returns null for non-Error values", () => {
    expect(githubRateLimitResponse("string error")).toBeNull();
    expect(githubRateLimitResponse(null)).toBeNull();
  });

  it("returns 429 Response for GitHubRateLimitError", () => {
    const details = {
      code: "GITHUB_RATE_LIMITED" as const,
      message: "Rate limit reached",
      resetAt: "2025-06-17T00:00:00.000Z",
      resetAtEpoch: 1750137600,
    };
    const error = new GitHubRateLimitError(details);
    const response = githubRateLimitResponse(error);
    expect(response).not.toBeNull();
    expect((response as Response).status).toBe(429);
  });

});
