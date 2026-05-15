const GITHUB_API = "https://api.github.com";

export async function fetchUserEvents(token: string): Promise<GitHubEvent[]> {
  const res = await fetch(`${GITHUB_API}/user/events?per_page=100`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    },
  });
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  return res.json();
}

export async function fetchUserRepos(token: string): Promise<GitHubRepo[]> {
  const res = await fetch(
    `${GITHUB_API}/user/repos?sort=pushed&per_page=10`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    }
  );
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  return res.json();
}

export interface GitHubEvent {
  id: string;
  type: string;
  created_at: string;
  repo: { name: string };
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  open_issues_count: number;
  stargazers_count: number;
  pushed_at: string;
}

export interface GitHubIssueItem {
  state: string;
  created_at: string;
  closed_at: string | null;
}

export interface IssuesMetrics {
  opened: number;
  closed: number;
  currentlyOpen: number;
  avgCloseTimeDays: number;
  trend: number;
}

export async function fetchIssuesMetrics(
  token: string
): Promise<IssuesMetrics> {
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
  };

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const since30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const searchRes = await fetch(
    `https://api.github.com/search/issues?q=type:issue+author:@me+created:>=${since30d.toISOString().slice(0, 10)}&per_page=100`,
    { headers, cache: "no-store" }
  );
  if (!searchRes.ok) throw new Error(`GitHub API error: ${searchRes.status}`);

  const searchData = (await searchRes.json()) as { items: GitHubIssueItem[] };
  const items = searchData.items;

  const opened = items.length;
  const closedItems = items.filter((i) => i.state === "closed" && i.closed_at);
  const closed = closedItems.length;
  const currentlyOpen = items.filter((i) => i.state === "open").length;

  const avgCloseTimeDays =
    closedItems.length > 0
      ? Math.round(
          closedItems.reduce((sum, i) => {
            return sum + (new Date(i.closed_at!).getTime() - new Date(i.created_at).getTime());
          }, 0) /
            closedItems.length /
            86400000
        )
      : 0;

  const thisMonthRes = await fetch(
    `https://api.github.com/search/issues?q=type:issue+author:@me+created:>=${thisMonthStart.toISOString().slice(0, 10)}&per_page=1`,
    { headers, cache: "no-store" }
  );
  const lastMonthRes = await fetch(
    `https://api.github.com/search/issues?q=type:issue+author:@me+created:${lastMonthStart.toISOString().slice(0, 10)}..${lastMonthEnd.toISOString().slice(0, 10)}&per_page=1`,
    { headers, cache: "no-store" }
  );

  const thisMonthCount = thisMonthRes.ok ? ((await thisMonthRes.json()) as { total_count: number }).total_count : 0;
  const lastMonthCount = lastMonthRes.ok ? ((await lastMonthRes.json()) as { total_count: number }).total_count : 0;

  return {
    opened,
    closed,
    currentlyOpen,
    avgCloseTimeDays,
    trend: thisMonthCount - lastMonthCount,
  };
}
