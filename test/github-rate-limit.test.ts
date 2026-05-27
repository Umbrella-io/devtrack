import { describe, expect, it } from "vitest";
import {
  GITHUB_RATE_LIMIT_CODE,
  GitHubRateLimitError,
  getGitHubRateLimitError,
  githubApiErrorResponse,
  readGitHubRateLimitDetails,
} from "@/lib/github-rate-limit";

describe("GitHub rate limit helpers", () => {
  it("detects exhausted GitHub rate limit headers", () => {
    const response = new Response(null, {
      status: 403,
      headers: {
        "x-ratelimit-remaining": "0",
        "x-ratelimit-reset": "1779874200",
      },
    });

    const error = getGitHubRateLimitError(response);

    expect(error).toBeInstanceOf(GitHubRateLimitError);
    expect(error?.resetAtUnix).toBe(1779874200);
  });

  it("returns a structured API response for rate limits", async () => {
    const response = githubApiErrorResponse(
      new GitHubRateLimitError(1779874200)
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(response.headers.get("X-RateLimit-Reset")).toBe("1779874200");
    expect(payload).toMatchObject({
      code: GITHUB_RATE_LIMIT_CODE,
      error: "GitHub API rate limit reached",
      resetAtUnix: 1779874200,
    });
  });

  it("reads the structured response shape on the client", async () => {
    const response = Response.json(
      {
        code: GITHUB_RATE_LIMIT_CODE,
        error: "GitHub API rate limit reached",
        message: "GitHub API rate limit reached. Data will refresh at 10:00 AM.",
        resetAt: "2026-05-27T04:30:00.000Z",
        resetAtUnix: 1779874200,
      },
      { status: 403 }
    );

    const details = await readGitHubRateLimitDetails(response);

    expect(details).toEqual({
      code: GITHUB_RATE_LIMIT_CODE,
      error: "GitHub API rate limit reached",
      message: "GitHub API rate limit reached. Data will refresh at 10:00 AM.",
      resetAt: "2026-05-27T04:30:00.000Z",
      resetAtUnix: 1779874200,
    });
  });
});
