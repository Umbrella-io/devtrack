export class GitHubApiError extends Error {
  status: number;
  endpoint: string;
  details: string;

  constructor(endpoint: string, status: number, details: string) {
    super("GitHub API failed");
    this.status = status;
    this.endpoint = endpoint;
    this.details = details;
  }
}

export function toGitHubErrorResponse(error: unknown) {
  if (error instanceof GitHubApiError) {
    return Response.json(
      {
        error: "GitHub API failed",
        endpoint: error.endpoint,
        status: error.status,
        details: error.details,
      },
      { status: error.status }
    );
  }
  return Response.json({ error: "GitHub API error" }, { status: 502 });
}
