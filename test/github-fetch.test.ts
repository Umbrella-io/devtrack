import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  GitHubRateLimitError,
  GitHubApiError,
  githubFetch,
  githubGraphQL,
} from "@/lib/github-fetch";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

// ─── GitHubRateLimitError ────────────────────────────────────────────────────

describe("GitHubRateLimitError", () => {
  it("should have correct name and message", () => {
    const error = new GitHubRateLimitError(null);
    expect(error.name).toBe("GitHubRateLimitError");
    expect(error.message).toBe("GitHub API rate limit exceeded");
  });

  it("should store resetAt date when provided", () => {
    const date = new Date("2025-01-01T00:00:00Z");
    const error = new GitHubRateLimitError(date);
    expect(error.resetAt).toEqual(date);
  });

  it("should store null resetAt when not provided", () => {
    const error = new GitHubRateLimitError(null);
    expect(error.resetAt).toBeNull();
  });

  it("should be instance of Error", () => {
    const error = new GitHubRateLimitError(null);
    expect(error).toBeInstanceOf(Error);
  });
});

// ─── GitHubApiError ──────────────────────────────────────────────────────────

describe("GitHubApiError", () => {
  it("should have correct name and message", () => {
    const error = new GitHubApiError(404);
    expect(error.name).toBe("GitHubApiError");
    expect(error.message).toBe("GitHub API error: 404");
  });

  it("should store status code", () => {
    const error = new GitHubApiError(500);
    expect(error.status).toBe(500);
  });

  it("should be instance of Error", () => {
    const error = new GitHubApiError(404);
    expect(error).toBeInstanceOf(Error);
  });
});

// ─── githubFetch ─────────────────────────────────────────────────────────────

describe("githubFetch", () => {
  it("should return parsed JSON on success", async () => {
    const mockData = { login: "testuser", id: 123 };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockData,
      headers: { get: () => null },
    });

    const result = await githubFetch(
      "https://api.github.com/users/testuser",
      "test-token"
    );
    expect(result).toEqual(mockData);
  });

  it("should throw GitHubRateLimitError on 403", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      headers: { get: () => null },
    });

    await expect(
      githubFetch("https://api.github.com/test", "test-token")
    ).rejects.toThrow(GitHubRateLimitError);
  });

  it("should throw GitHubRateLimitError on 429", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      headers: { get: () => null },
    });

    await expect(
      githubFetch("https://api.github.com/test", "test-token")
    ).rejects.toThrow(GitHubRateLimitError);
  });

  it("should parse resetAt from X-RateLimit-Reset header", async () => {
    const resetTimestamp = 1735689600;
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      headers: { get: (key: string) => key === "X-RateLimit-Reset" ? String(resetTimestamp) : null },
    });

    try {
      await githubFetch("https://api.github.com/test", "test-token");
    } catch (err) {
      expect(err).toBeInstanceOf(GitHubRateLimitError);
      const rateLimitErr = err as GitHubRateLimitError;
      expect(rateLimitErr.resetAt).toEqual(
        new Date(resetTimestamp * 1000)
      );
    }
  });

  it("should set resetAt to null when header is missing", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      headers: { get: () => null },
    });

    try {
      await githubFetch("https://api.github.com/test", "test-token");
    } catch (err) {
      expect(err).toBeInstanceOf(GitHubRateLimitError);
      expect((err as GitHubRateLimitError).resetAt).toBeNull();
    }
  });

  it("should throw GitHubApiError on other non-ok status", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      headers: { get: () => null },
    });

    await expect(
      githubFetch("https://api.github.com/test", "test-token")
    ).rejects.toThrow(GitHubApiError);
  });

  it("should send correct Authorization header", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({}),
      headers: { get: () => null },
    });

    await githubFetch("https://api.github.com/test", "my-token");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.github.com/test",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer my-token",
        }),
      })
    );
  });
});

// ─── githubGraphQL ───────────────────────────────────────────────────────────

describe("githubGraphQL", () => {
  it("should return data on success", async () => {
    const mockData = { viewer: { login: "testuser" } };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: mockData }),
      headers: { get: () => null },
    });

    const result = await githubGraphQL("{ viewer { login } }", "test-token");
    expect(result).toEqual(mockData);
  });

  it("should throw GitHubRateLimitError on 403", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      headers: { get: () => null },
    });

    await expect(
      githubGraphQL("{ viewer { login } }", "test-token")
    ).rejects.toThrow(GitHubRateLimitError);
  });

  it("should throw GitHubRateLimitError on 429", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      headers: { get: () => null },
    });

    await expect(
      githubGraphQL("{ viewer { login } }", "test-token")
    ).rejects.toThrow(GitHubRateLimitError);
  });

  it("should throw GitHubApiError on other non-ok status", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      headers: { get: () => null },
    });

    await expect(
      githubGraphQL("{ viewer { login } }", "test-token")
    ).rejects.toThrow(GitHubApiError);
  });
});
