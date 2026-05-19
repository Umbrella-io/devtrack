export class RateLimitError extends Error {
  resetAt: number;

  constructor(resetAt: number) {
    super("GitHub API rate limited");
    this.resetAt = resetAt;
    this.name = "RateLimitError";
  }
}

export async function githubFetch(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const response = await fetch(url, options);

  if (response.status === 429) {
    const data = (await response.json()) as { message?: string };
    const resetAtHeader = response.headers.get("X-RateLimit-Reset");
    const resetAt = resetAtHeader ? parseInt(resetAtHeader) * 1000 : Date.now() + 3600000;
    throw new RateLimitError(resetAt);
  }

  return response;
}
