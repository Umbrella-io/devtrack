/**
 * Typed GitHub API fetch helper.
 * Centralises Authorization headers, Accept header, ok-check,
 * and rate-limit error handling so metric routes don't
 * repeat the same ~10-line pattern.
 */

import { GITHUB_API, GitHubAuthError } from "@/lib/github";

export { GITHUB_API, GitHubAuthError };

export class GitHubRateLimitError extends Error {
  constructor(
    public resetAt: Date | null,
    public retryAfter: number | null = null,
  ) {
    super("GitHub API rate limit exceeded");
    this.name = "GitHubRateLimitError";
  }
}

export class GitHubApiError extends Error {
  constructor(public status: number) {
    super(`GitHub API error: ${status}`);
    this.name = "GitHubApiError";
  }
}

/**
 * Returns a structured JSON response for GitHub credential failures.
 * All metrics routes should use this instead of a generic 502 when GitHub
 * returns 401, so the frontend can distinguish auth failures from other errors
 * and offer a reconnect action.
 */
export function githubAuthErrorResponse(): Response {
  return Response.json({ error: "github_auth_invalid" }, { status: 401 });
}

function extractRateLimitInfo(headers: Headers): {
  resetAt: Date | null;
  retryAfter: number | null;
  remaining: number | null;
} {
  const resetHeader = headers.get("X-RateLimit-Reset");
  const retryAfterHeader = headers.get("Retry-After");
  const remainingHeader = headers.get("X-RateLimit-Remaining");

  return {
    resetAt: resetHeader ? new Date(Number(resetHeader) * 1000) : null,
    retryAfter: retryAfterHeader !== null ? Number(retryAfterHeader) : null,
    remaining: remainingHeader !== null ? Number(remainingHeader) : null,
  };
}

function isSecondaryRateLimitBody(body: unknown): boolean {
  if (typeof body !== "object" || body === null) return false;
  const message = ((body as { message?: string }).message ?? "").toLowerCase();
  return (
    message.includes("secondary rate limit") ||
    message.includes("rate limit exceeded") ||
    message.includes("exceeded a secondary")
  );
}

async function buildGitHubError(
  res: Response,
): Promise<GitHubAuthError | GitHubRateLimitError | GitHubApiError> {
  // 401: invalid or revoked credential — surface as auth error, not generic API error
  if (res.status === 401) {
    return new GitHubAuthError();
  }

  const { resetAt, retryAfter, remaining } = extractRateLimitInfo(res.headers);

  // 429: always a rate limit
  if (res.status === 429) {
    return new GitHubRateLimitError(resetAt, retryAfter);
  }

  if (res.status === 403) {
    // Primary rate limit: quota exhausted
    if (remaining === 0) {
      return new GitHubRateLimitError(resetAt, retryAfter);
    }

    // Secondary rate limit: Retry-After header signals required backoff
    if (retryAfter !== null) {
      return new GitHubRateLimitError(resetAt, retryAfter);
    }

    // Secondary rate limit: body message indicates rate limiting
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      // Body not JSON or stream already consumed
    }
    if (isSecondaryRateLimitBody(body)) {
      return new GitHubRateLimitError(resetAt, retryAfter);
    }

    // Authorization failure: invalid token, insufficient scope, permissions
    return new GitHubApiError(res.status);
  }

  return new GitHubApiError(res.status);
}

/**
 * Fetch a GitHub API endpoint with standard headers.
 * Throws GitHubRateLimitError when response headers or body indicate actual rate limiting:
 * - 429 responses
 * - 403 with X-RateLimit-Remaining: 0 (primary rate limit)
 * - 403 with Retry-After header (secondary rate limit)
 * - 403 with rate-limit message in response body (secondary rate limit)
 * Authorization failures (invalid token, insufficient scope, permissions) throw GitHubApiError.
 */
export async function githubFetch<T>(
  url: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      ...((options.headers as Record<string, string>) ?? {}),
    },
    cache: (options.cache as RequestCache) ?? "no-store",
  });

  if (!res.ok) {
    throw await buildGitHubError(res);
  }

  return res.json() as Promise<T>;
}

/**
 * POST to GitHub GraphQL API.
 */
export async function githubGraphQL<T>(
  query: string,
  token: string
): Promise<T> {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw await buildGitHubError(res);
  }

  const json = await res.json();
  return json.data as T;
}
