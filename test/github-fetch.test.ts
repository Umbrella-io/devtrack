import { describe, it, expect, vi, beforeEach } from "vitest";
import { GitHubRateLimitError, GitHubApiError, githubFetch, githubGraphQL } from "../src/lib/github-fetch";

describe("GitHubRateLimitError", () => {
  it("creates error with resetAt date", () => {
    const resetAt = new Date();
    const error = new GitHubRateLimitError(resetAt);
    expect(error.name).toBe("GitHubRateLimitError");
    expect(error.message).toBe("GitHub API rate limit exceeded");
    expect(error.resetAt).toBe(resetAt);
  });

  it("creates error with null resetAt", () => {
    const error = new GitHubRateLimitError(null);
    expect(error.resetAt).toBeNull();
  });
});

describe("GitHubApiError", () => {
  it("creates error with status code", () => {
    const error = new GitHubApiError(404);
    expect(error.name).toBe("GitHubApiError");
    expect(error.message).toBe("GitHub API error: 404");
    expect(error.status).toBe(404);
  });

  it("creates error with different status codes", () => {
    const error = new GitHubApiError(500);
    expect(error.status).toBe(500);
    expect(error.message).toBe("GitHub API error: 500");
  });
});

describe("githubFetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns JSON on success", async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({ data: "test" }),
    };
    const mockFetch = vi.fn().mockResolvedValue(mockResponse);
    vi.stubGlobal("fetch", mockFetch);

    const result = await githubFetch("https://api.github.com/test", "fake-token");
    expect(result).toEqual({ data: "test" });
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.github.com/test",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer fake-token",
          Accept: "application/vnd.github+json",
        }),
      })
    );
  });

  it("throws GitHubRateLimitError on 403", async () => {
    const mockResponse = {
      ok: false,
      status: 403,
      headers: new Map([["X-RateLimit-Reset", "1234567890"]]),
    };
    const mockFetch = vi.fn().mockResolvedValue(mockResponse);
    vi.stubGlobal("fetch", mockFetch);

    await expect(githubFetch("https://api.github.com/test", "fake-token")).rejects.toThrow(GitHubRateLimitError);
  });

  it("throws GitHubRateLimitError on 429", async () => {
    const mockResponse = {
      ok: false,
      status: 429,
      headers: new Map(),
    };
    const mockFetch = vi.fn().mockResolvedValue(mockResponse);
    vi.stubGlobal("fetch", mockFetch);

    await expect(githubFetch("https://api.github.com/test", "fake-token")).rejects.toThrow(GitHubRateLimitError);
  });

  it("throws GitHubApiError on other non-ok responses", async () => {
    const mockResponse = {
      ok: false,
      status: 404,
    };
    const mockFetch = vi.fn().mockResolvedValue(mockResponse);
    vi.stubGlobal("fetch", mockFetch);

    await expect(githubFetch("https://api.github.com/test", "fake-token")).rejects.toThrow(GitHubApiError);
  });
});

describe("githubGraphQL", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns data on success", async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({ data: { test: true } }),
    };
    const mockFetch = vi.fn().mockResolvedValue(mockResponse);
    vi.stubGlobal("fetch", mockFetch);

    const result = await githubGraphQL("{ test }", "fake-token");
    expect(result).toEqual({ test: true });
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.github.com/graphql",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer fake-token",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({ query: "{ test }" }),
      })
    );
  });

  it("throws GitHubRateLimitError on 403", async () => {
    const mockResponse = {
      ok: false,
      status: 403,
      headers: new Map(),
    };
    const mockFetch = vi.fn().mockResolvedValue(mockResponse);
    vi.stubGlobal("fetch", mockFetch);

    await expect(githubGraphQL("{ test }", "fake-token")).rejects.toThrow(GitHubRateLimitError);
  });

  it("throws GitHubApiError on non-ok responses", async () => {
    const mockResponse = {
      ok: false,
      status: 500,
    };
    const mockFetch = vi.fn().mockResolvedValue(mockResponse);
    vi.stubGlobal("fetch", mockFetch);

    await expect(githubGraphQL("{ test }", "fake-token")).rejects.toThrow(GitHubApiError);
  });
});