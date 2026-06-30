import { GitHubAuthError } from "@/lib/github-fetch";

// A valid GitHub repository identifier is exactly "owner/repo".
const REPO_IDENTIFIER_RE =
  /^([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?)\/([a-zA-Z0-9._-]{1,100})$/;

export interface ParsedRepo {
  owner: string;
  repo: string;
}

/**
 * Validates and parses a raw "owner/repo" string.
 * Returns the split components on success, or null if the value is invalid.
 */
export function parseRepoParam(raw: string): ParsedRepo | null {
  const trimmed = raw.trim();
  const match = REPO_IDENTIFIER_RE.exec(trimmed);
  if (!match) return null;

  const [, owner, repo] = match;
  if (repo === "." || repo === "..") return null;

  return { owner, repo };
}

export interface RepoSummary {
  name: string;
  commits: number;
  description: string | null;
  url: string;
}

export async function fetchTopRepos(
  githubLogin: string,
  token?: string,
  days: number = 30,
  options: { orgName?: string | null; excludedOrgs?: string[] } = {}
): Promise<RepoSummary[]> {
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let q = `author:${githubLogin}`;
  if (options.orgName) {
    q += `+org:${options.orgName}`;
  } else if (options.excludedOrgs && options.excludedOrgs.length > 0) {
    q += options.excludedOrgs.map((org) => `+-org:${org}`).join("");
  }
  q += `+author-date:>=${since}`;

  const url = `https://api.github.com/search/commits?q=${q}&per_page=100&sort=author-date&order=desc`;
  const searchRes = await fetch(url, { headers, cache: "no-store" });

  if (!searchRes.ok) {
    if (searchRes.status === 401) {
      throw new GitHubAuthError();
    }
    throw new Error("GitHub API error fetching repos");
  }

  const data = (await searchRes.json()) as {
    items: Array<{
      repository: {
        full_name: string;
        html_url: string;
        description?: string | null;
      };
    }>;
  };

  const repoMap: Record<string, { commits: number; description: string | null; url: string }> = {};
  for (const item of data.items) {
    const name = item.repository.full_name;
    if (!repoMap[name]) {
      repoMap[name] = {
        commits: 0,
        description: item.repository.description ?? null,
        url: item.repository.html_url,
      };
    }
    repoMap[name].commits++;
  }

  return Object.entries(repoMap)
    .map(([name, info]) => ({ name, ...info }))
    .sort((a, b) => b.commits - a.commits)
    .slice(0, 6);
}

