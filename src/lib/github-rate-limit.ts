export interface GitHubRateLimitDetails {
  code: "GITHUB_RATE_LIMITED";
  message: string;
  resetAt: string | null;
  resetAtEpoch: number | null;
}

export class GitHubRateLimitError extends Error {
  details: GitHubRateLimitDetails;

  constructor(details: GitHubRateLimitDetails) {
    super(details.message);
    this.name = "GitHubRateLimitError";
    this.details = details;
  }
}

export function getGitHubRateLimitDetails(
  response: Pick<Response, "status" | "headers">
): GitHubRateLimitDetails | null {
  const remaining = response.headers.get("x-ratelimit-remaining");
  const resetHeader = response.headers.get("x-ratelimit-reset");

  const isRateLimitedStatus = response.status === 403 || response.status === 429;
  const isQuotaExhausted = remaining === "0";

  if (!isRateLimitedStatus || !isQuotaExhausted) {
    return null;
  }

  const parsedResetEpoch = resetHeader ? Number(resetHeader) : Number.NaN;
  const resetAtEpoch = Number.isFinite(parsedResetEpoch)
    ? parsedResetEpoch
    : null;

  const resetAt = resetAtEpoch
    ? new Date(resetAtEpoch * 1000).toISOString()
    : null;

  return {
    code: "GITHUB_RATE_LIMITED",
    message: resetAt
      ? `GitHub API rate limit reached. Data will refresh at ${resetAt}.`
      : "GitHub API rate limit reached. Please try again later.",
    resetAt,
    resetAtEpoch,
  };
}

export function throwIfGitHubRateLimited(response: Response): void {
  const details = getGitHubRateLimitDetails(response);

  if (details) {
    throw new GitHubRateLimitError(details);
  }
}

export function githubRateLimitResponse(error: unknown): Response | null {
  if (!(error instanceof GitHubRateLimitError)) {
    return null;
  }

  return Response.json(
    {
      error: error.details.code,
      message: error.details.message,
      rateLimit: {
        resetAt: error.details.resetAt,
        resetAtEpoch: error.details.resetAtEpoch,
      },
    },
    { status: 429 }
  );
}