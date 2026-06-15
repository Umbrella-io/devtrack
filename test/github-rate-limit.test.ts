import { describe, it, expect } from "vitest";
import {
  getGitHubRateLimitDetails,
  throwIfGitHubRateLimited,
  githubRateLimitResponse,
  GitHubRateLimitError,
  type GitHubRateLimitDetails,
} from "../src/lib/github-rate-limit";

function makeResponse(
  status: number,
  headers: Record<string, string> = {}
): Response {
  return new Response(null, {
    status,
    headers,
  });
}

describe("getGitHubRateLimitDetails", () => {
  it("returns null for a 200 response even with remaining=0", () => {
    const res = makeResponse(200, {
      "x-ratelimit-remaining": "0",
      "x-ratelimit-reset": "1700000000",
    });
    expect(getGitHubRateLimitDetails(res)).toBeNull();
  });

  it("returns null for a 404 response", () => {
    const res = makeResponse(404);
    expect(getGitHubRateLimitDetails(res)).toBeNull();
  });

  it("returns null for 403 with remaining=1 (still has budget)", () => {
    const res = makeResponse(403, {
      "x-ratelimit-remaining": "1",
      "x-ratelimit-reset": "1700000000",
    });
    expect(getGitHubRateLimitDetails(res)).toBeNull();
  });

  it("returns full details for 403 with remaining=0 and a valid reset header", () => {
    const res = makeResponse(403, {
      "x-ratelimit-remaining": "0",
      "x-ratelimit-reset": "1700000000",
    });
    const details = getGitHubRateLimitDetails(res);
    expect(details).not.toBeNull();
    expect(details!.code).toBe("GITHUB_RATE_LIMITED");
    expect(details!.resetAtEpoch).toBe(1700000000);
    expect(details!.resetAt).toBe(new Date(1700000000 * 1000).toISOString());
    expect(details!.message).toContain("Data will refresh at");
  });

  it("returns full details for 429 with remaining=0 and a valid reset header", () => {
    const res = makeResponse(429, {
      "x-ratelimit-remaining": "0",
      "x-ratelimit-reset": "1700000000",
    });
    const details = getGitHubRateLimitDetails(res);
    expect(details).not.toBeNull();
    expect(details!.code).toBe("GITHUB_RATE_LIMITED");
    expect(details!.resetAtEpoch).toBe(1700000000);
  });

  it("returns resetAt: null when the reset header is missing", () => {
    const res = makeResponse(403, {
      "x-ratelimit-remaining": "0",
    });
    const details = getGitHubRateLimitDetails(res);
    expect(details).not.toBeNull();
    expect(details!.resetAt).toBeNull();
    expect(details!.resetAtEpoch).toBeNull();
    expect(details!.message).toBe(
      "GitHub API rate limit reached. Please try again later."
    );
  });

  it("returns resetAt: null when the reset header is non-numeric", () => {
    const res = makeResponse(403, {
      "x-ratelimit-remaining": "0",
      "x-ratelimit-reset": "not-a-number",
    });
    const details = getGitHubRateLimitDetails(res);
    expect(details).not.toBeNull();
    expect(details!.resetAt).toBeNull();
    expect(details!.resetAtEpoch).toBeNull();
  });
});

describe("throwIfGitHubRateLimited", () => {
  it("does not throw for a 200 response", () => {
    const res = makeResponse(200);
    expect(() => throwIfGitHubRateLimited(res)).not.toThrow();
  });

  it("throws GitHubRateLimitError for 403 with remaining=0", () => {
    const res = makeResponse(403, {
      "x-ratelimit-remaining": "0",
      "x-ratelimit-reset": "1700000000",
    });
    expect(() => throwIfGitHubRateLimited(res)).toThrow(GitHubRateLimitError);

    try {
      throwIfGitHubRateLimited(res);
    } catch (err) {
      expect(err).toBeInstanceOf(GitHubRateLimitError);
      const ghErr = err as GitHubRateLimitError;
      expect(ghErr.name).toBe("GitHubRateLimitError");
      expect(ghErr.details.code).toBe("GITHUB_RATE_LIMITED");
      expect(ghErr.details.resetAtEpoch).toBe(1700000000);
      expect(ghErr.message).toBe(ghErr.details.message);
    }
  });

  it("does not throw for 403 with remaining=1", () => {
    const res = makeResponse(403, {
      "x-ratelimit-remaining": "1",
    });
    expect(() => throwIfGitHubRateLimited(res)).not.toThrow();
  });
});

describe("githubRateLimitResponse", () => {
  it("returns null for a plain Error", () => {
    expect(githubRateLimitResponse(new Error("nope"))).toBeNull();
  });

  it("returns null for a string error", () => {
    expect(githubRateLimitResponse("rate limited")).toBeNull();
  });

  it("returns null for null/undefined", () => {
    expect(githubRateLimitResponse(null)).toBeNull();
    expect(githubRateLimitResponse(undefined)).toBeNull();
  });

  it("returns a 429 Response for a GitHubRateLimitError", async () => {
    const details: GitHubRateLimitDetails = {
      code: "GITHUB_RATE_LIMITED",
      message: "GitHub API rate limit reached. Please try again later.",
      resetAt: null,
      resetAtEpoch: null,
    };
    const err = new GitHubRateLimitError(details);
    const res = githubRateLimitResponse(err);

    expect(res).not.toBeNull();
    expect(res!.status).toBe(429);

    const body = (await res!.json()) as Record<string, unknown>;
    expect(body.error).toBe("GITHUB_RATE_LIMITED");
    expect(body.message).toBe(details.message);
    expect(body.rateLimit).toEqual({
      resetAt: null,
      resetAtEpoch: null,
    });
  });

  it("includes the resetAt ISO string and resetAtEpoch in the 429 body", async () => {
    const details: GitHubRateLimitDetails = {
      code: "GITHUB_RATE_LIMITED",
      message: "GitHub API rate limit reached. Data will refresh at 2023-11-14T22:13:20.000Z.",
      resetAt: "2023-11-14T22:13:20.000Z",
      resetAtEpoch: 1700000000,
    };
    const err = new GitHubRateLimitError(details);
    const res = githubRateLimitResponse(err);

    expect(res).not.toBeNull();
    const body = (await res!.json()) as Record<string, unknown>;
    expect(body.rateLimit).toEqual({
      resetAt: "2023-11-14T22:13:20.000Z",
      resetAtEpoch: 1700000000,
    });
  });
});
