const GRAPHQL_API = "https://api.github.com/graphql";

type CacheEntry<T> = { value: T; expiry: number };

const cache = new Map<string, CacheEntry<any>>();

function getFromCache<T>(key: string): T | null {
  const ttl = process.env.GITHUB_CACHE_TTL ? parseInt(process.env.GITHUB_CACHE_TTL, 10) : 60;
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    cache.delete(key);
    return null;
  }
  return entry.value as T;
}

function setCache<T>(key: string, value: T) {
  const ttl = process.env.GITHUB_CACHE_TTL ? parseInt(process.env.GITHUB_CACHE_TTL, 10) : 60;
  cache.set(key, { value, expiry: Date.now() + ttl * 1000 });
}

async function graphqlRequest(token: string, body: object) {
  const res = await fetch(GRAPHQL_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (res.status === 401) throw new Error("GitHub auth error: unauthorized");
  if (res.status === 403 || res.status === 429) {
    const reset = res.headers.get("x-ratelimit-reset");
    throw new Error(`GitHub rate limit: ${res.status}${reset ? ` reset=${reset}` : ""}`);
  }

  if (!res.ok) throw new Error(`GitHub GraphQL error: ${res.status}`);
  return res.json();
}

export interface IssuesMetrics {
  opened: number;
  closed: number;
  currentlyOpen: number;
  avgCloseTimeDays: number;
  trend: number;
}

export async function fetchIssuesMetricsGraphQL(token: string): Promise<IssuesMetrics> {
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const cacheKey = `issuesMetrics:${token}:${since30d}`;

  const cached = getFromCache<IssuesMetrics>(cacheKey);
  if (cached) return cached;

  const pageCap = process.env.GITHUB_PAGE_CAP ? parseInt(process.env.GITHUB_PAGE_CAP, 10) : 1000;

  const perPage = 100; // GraphQL max for search edges traversal
  let after: string | null = null;
  let fetched = 0;
  const items: Array<{ state: string; createdAt: string; closedAt?: string | null }> = [];

  const baseQuery = `type:issue author:@me created:>=${since30d}`;

  while (fetched < pageCap) {
    const query = `
      query($q:String!, $first:Int!, $after:String) {
        search(query: $q, type: ISSUE, first: $first, after: $after) {
          issueCount
          pageInfo { endCursor hasNextPage }
          nodes {
            ... on Issue { state createdAt closedAt }
          }
        }
      }
    `;

    const vars: any = { q: baseQuery, first: perPage };
    if (after) vars.after = after;

    const data = await graphqlRequest(token, { query, variables: vars });
    const search = data.data.search;
    const nodes = search.nodes || [];

    for (const n of nodes) {
      items.push({ state: n.state, createdAt: n.createdAt, closedAt: n.closedAt || null });
      fetched += 1;
      if (fetched >= pageCap) break;
    }

    if (!search.pageInfo.hasNextPage) break;
    after = search.pageInfo.endCursor;
  }

  const opened = items.length;
  const closedItems = items.filter((i) => i.state === "CLOSED" && i.closedAt);
  const closed = closedItems.length;
  const currentlyOpen = items.filter((i) => i.state === "OPEN").length;

  const avgCloseTimeDays =
    closedItems.length > 0
      ? Math.round(
          closedItems.reduce((sum, i) => sum + (new Date(i.closedAt!).getTime() - new Date(i.createdAt).getTime()), 0) /
            closedItems.length /
            86400000
        )
      : 0;

  // thisMonth / lastMonth counts via small queries that return only counts
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);

  const countQuery = `query($q:String!){ search(query:$q,type:ISSUE, first:1){ issueCount } }`;

  const thisMonthData = await graphqlRequest(token, { query: countQuery, variables: { q: `type:issue author:@me created:>=${thisMonthStart}` } });
  const lastMonthData = await graphqlRequest(token, { query: countQuery, variables: { q: `type:issue author:@me created:${lastMonthStart}..${lastMonthEnd}` } });

  const thisMonthCount = thisMonthData.data.search.issueCount || 0;
  const lastMonthCount = lastMonthData.data.search.issueCount || 0;

  const result: IssuesMetrics = {
    opened,
    closed,
    currentlyOpen,
    avgCloseTimeDays,
    trend: thisMonthCount - lastMonthCount,
  };

  setCache(cacheKey, result);
  return result;
}

export function clearGraphQLCache() {
  cache.clear();
}
