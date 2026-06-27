/**
 * Typed GitHub API fetch helper.
 * Centralises Authorization headers, Accept header, ok-check,
 * and rate-limit error handling so metric routes don't
 * repeat the same ~10-line pattern.
 */

import { GITHUB_API } from "@/lib/github";
import { markTokenRevokedNow } from "@/lib/token-revocation-flag";

export { GITHUB_API };

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

export class GitHubAuthError extends Error {
  readonly status = 401;
  constructor() {
    super("GitHub token revoked or expired");
    this.name = "GitHubAuthError";
  }
}

export function githubAuthErrorResponse(): Response {
  return Response.json(
    { error: "token_expired" },
    { status: 401 }
  );
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
  githubId?: string,
): Promise<GitHubRateLimitError | GitHubApiError> {
  const { resetAt, retryAfter, remaining } = extractRateLimitInfo(res.headers);

  if (res.status === 429) {
    return new GitHubRateLimitError(resetAt, retryAfter);
  }

  if (res.status === 403) {
    if (remaining === 0) {
      return new GitHubRateLimitError(resetAt, retryAfter);
    }
    if (retryAfter !== null) {
      return new GitHubRateLimitError(resetAt, retryAfter);
    }
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      // Body not JSON or stream already consumed
    }
    if (isSecondaryRateLimitBody(body)) {
      return new GitHubRateLimitError(resetAt, retryAfter);
    }
    return new GitHubApiError(res.status);
  }

  if (res.status === 401 && githubId) {
    // Live signal: this token just failed against GitHub right now. Flag it
    // immediately so the next session check surfaces "TokenRevoked" without
    // waiting for the 24h periodic validation in auth.ts.
    await markTokenRevokedNow(githubId);
  }

  return new GitHubApiError(res.status);
}

/**
 * Fetch a GitHub API endpoint with standard headers.
 * Pass githubId when available so a live 401 can immediately flag the
 * token as revoked (see lib/token-revocation-flag.ts).
 */
export async function githubFetch<T>(
  url: string,
  token: string,
  options: RequestInit = {},
  githubId?: string,
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
    throw await buildGitHubError(res, githubId);
  }

  return res.json() as Promise<T>;
}

/**
 * POST to GitHub GraphQL API.
 */
export async function githubGraphQL<T>(
  query: string,
  token: string,
  variables?: Record<string, unknown>,
  githubId?: string,
): Promise<T> {

  const MAX_RETRIES = 2;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
      cache: "no-store",
    });

    if ((res.status === 502 || res.status === 503) && attempt < MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      continue;
    }

    if (!res.ok) {
      throw await buildGitHubError(res, githubId);
    }

    const json = await res.json();

    if (json.errors?.length) {
      const msg = json.errors.map((e: { message: string }) => e.message).join("; ");
      throw new Error(`GitHub GraphQL error: ${msg}`);
    }

    return json.data as T;
  }

  throw new GitHubApiError(502);
}
