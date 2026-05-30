/**
 * Typed GitHub API fetch helper.
 * Centralises Authorization headers, Accept header, ok-check,
 * and 403/429 rate-limit error handling so metric routes don't
 * repeat the same ~10-line pattern.
 */

import { GITHUB_API } from "@/lib/github";

export { GITHUB_API };

export class GitHubRateLimitError extends Error {
  constructor(public resetAt: Date | null) {
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
 * Fetch a GitHub API endpoint with standard headers.
 * Throws GitHubRateLimitError on 403/429, GitHubApiError on other non-ok responses.
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

  if (res.status === 403 || res.status === 429) {
    const resetHeader = res.headers.get("X-RateLimit-Reset");
    const resetAt = resetHeader ? new Date(Number(resetHeader) * 1000) : null;
    throw new GitHubRateLimitError(resetAt);
  }

  if (!res.ok) {
    throw new GitHubApiError(res.status);
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

  if (res.status === 403 || res.status === 429) {
    const resetHeader = res.headers.get("X-RateLimit-Reset");
    const resetAt = resetHeader ? new Date(Number(resetHeader) * 1000) : null;
    throw new GitHubRateLimitError(resetAt);
  }

  if (!res.ok) {
    throw new GitHubApiError(res.status);
  }

  const json = await res.json();
  return json.data as T;
}