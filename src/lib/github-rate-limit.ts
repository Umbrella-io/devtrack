export const GITHUB_RATE_LIMIT_CODE = "GITHUB_RATE_LIMITED";

export interface GitHubRateLimitDetails {
  code: typeof GITHUB_RATE_LIMIT_CODE;
  error: string;
  message: string;
  resetAt: string | null;
  resetAtUnix: number | null;
}

export class GitHubRateLimitError extends Error {
  readonly code = GITHUB_RATE_LIMIT_CODE;
  readonly resetAt: Date | null;
  readonly resetAtUnix: number | null;

  constructor(resetAtUnix: number | null) {
    const resetAt = resetAtUnix ? new Date(resetAtUnix * 1000) : null;
    super(formatGitHubRateLimitMessage(resetAt));
    this.name = "GitHubRateLimitError";
    this.resetAt = resetAt;
    this.resetAtUnix = resetAtUnix;
  }
}

export function isGitHubRateLimitError(
  error: unknown
): error is GitHubRateLimitError {
  return error instanceof GitHubRateLimitError;
}

export function findGitHubRateLimitError(
  errors: Iterable<unknown>
): GitHubRateLimitError | null {
  for (const error of errors) {
    if (isGitHubRateLimitError(error)) {
      return error;
    }
  }

  return null;
}

export function formatGitHubRateLimitMessage(resetAt: Date | null): string {
  if (!resetAt) {
    return "GitHub API rate limit reached. Data will refresh when the limit resets.";
  }

  return `GitHub API rate limit reached. Data will refresh at ${resetAt.toLocaleTimeString(
    [],
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  )}.`;
}

function parseResetHeader(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function getGitHubRateLimitError(
  response: Pick<Response, "headers" | "status">
): GitHubRateLimitError | null {
  const remaining = response.headers.get("x-ratelimit-remaining");
  const resetAtUnix = parseResetHeader(response.headers.get("x-ratelimit-reset"));

  if ((response.status === 403 || response.status === 429) && remaining === "0") {
    return new GitHubRateLimitError(resetAtUnix);
  }

  return null;
}

export function throwIfGitHubRateLimited(response: Response): void {
  const error = getGitHubRateLimitError(response);
  if (error) {
    throw error;
  }
}

export function toGitHubRateLimitDetails(
  error: GitHubRateLimitError
): GitHubRateLimitDetails {
  return {
    code: GITHUB_RATE_LIMIT_CODE,
    error: "GitHub API rate limit reached",
    message: error.message,
    resetAt: error.resetAt?.toISOString() ?? null,
    resetAtUnix: error.resetAtUnix,
  };
}

export function githubApiErrorResponse(
  error: unknown,
  fallbackMessage = "GitHub API error",
  fallbackStatus = 502
): Response {
  if (isGitHubRateLimitError(error)) {
    const headers = new Headers();
    if (error.resetAtUnix) {
      headers.set("X-RateLimit-Reset", String(error.resetAtUnix));
    }

    return Response.json(toGitHubRateLimitDetails(error), {
      status: 403,
      headers,
    });
  }

  return Response.json({ error: fallbackMessage }, { status: fallbackStatus });
}

export async function readGitHubRateLimitDetails(
  response: Response
): Promise<GitHubRateLimitDetails | null> {
  const headerError = getGitHubRateLimitError(response);
  if (headerError) {
    return toGitHubRateLimitDetails(headerError);
  }

  try {
    const payload = (await response.clone().json()) as Partial<GitHubRateLimitDetails>;
    if (payload?.code === GITHUB_RATE_LIMIT_CODE) {
      return {
        code: GITHUB_RATE_LIMIT_CODE,
        error: payload.error ?? "GitHub API rate limit reached",
        message:
          payload.message ??
          formatGitHubRateLimitMessage(
            payload.resetAt ? new Date(payload.resetAt) : null
          ),
        resetAt: payload.resetAt ?? null,
        resetAtUnix: payload.resetAtUnix ?? null,
      };
    }
  } catch {
    return null;
  }

  return null;
}
