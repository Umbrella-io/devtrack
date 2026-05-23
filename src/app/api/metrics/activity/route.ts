import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";
import { authOptions } from "@/lib/auth";
import {
  getAccountToken,
  getAllAccounts,
} from "@/lib/github-accounts";
import { GITHUB_API, fetchUserEvents } from "@/lib/github";
import {
  isMetricsCacheBypassed,
  METRICS_CACHE_TTL_SECONDS,
  metricsCacheKey,
  withMetricsCache,
} from "@/lib/metrics-cache";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveAppUser } from "@/lib/resolve-user";

export const dynamic = "force-dynamic";

type ActivityType =
  | "push"
  | "pull_request"
  | "issue"
  | "release"
  | "other";

interface ActivityItem {
  id: string;
  type: ActivityType;
  createdAt: string;
  title: string;
  subtitle: string;
  repo: string;
  url: string;
}

interface RawEvent {
  id: string;
  type: string;
  created_at: string;
  repo?: { name?: string };
  payload?: {
    ref?: string;
    head?: string;
    action?: string;
    commits?: Array<{ sha?: string }>;
    pull_request?: {
      html_url?: string;
      number?: number;
      title?: string;
      merged?: boolean;
    };
    issue?: {
      html_url?: string;
      number?: number;
      title?: string;
    };
    release?: {
      html_url?: string;
      tag_name?: string;
      name?: string;
    };
  };
}

const SUPPORTED_EVENT_TYPES = new Set([
  "PushEvent",
  "PullRequestEvent",
  "IssuesEvent",
  "ReleaseEvent",
]);

function getRepoUrl(repoName: string): string {
  return `https://github.com/${repoName}`;
}

function capitalize(value: string): string {
  return value.length > 0
    ? value[0].toUpperCase() + value.slice(1)
    : "Updated";
}

function formatActivity(event: RawEvent): ActivityItem | null {
  const repoName = event.repo?.name;

  if (!repoName || !SUPPORTED_EVENT_TYPES.has(event.type)) {
    return null;
  }

  if (event.type === "PushEvent") {
    const commitCount = event.payload?.commits?.length ?? 0;
    const rawRef = event.payload?.ref ?? "";
    const branch = rawRef.replace("refs/heads/", "") || "default branch";
    const plural = commitCount === 1 ? "" : "s";

    return {
      id: event.id,
      type: "push",
      createdAt: event.created_at,
      title: `Pushed ${commitCount} commit${plural} to ${branch}`,
      subtitle: repoName,
      repo: repoName,
      url: event.payload?.head
        ? `https://github.com/${repoName}/commit/${event.payload.head}`
        : getRepoUrl(repoName),
    };
  }

  if (event.type === "PullRequestEvent") {
    const action = event.payload?.action ?? "updated";
    const pr = event.payload?.pull_request;
    const number = pr?.number ? `#${pr.number}` : "PR";
    const wasMerged = action === "closed" && pr?.merged === true;
    const actionText = wasMerged ? "Merged" : capitalize(action);

    return {
      id: event.id,
      type: "pull_request",
      createdAt: event.created_at,
      title: `${actionText} pull request ${number}`,
      subtitle: pr?.title ?? repoName,
      repo: repoName,
      url: pr?.html_url ?? getRepoUrl(repoName),
    };
  }

  if (event.type === "IssuesEvent") {
    const action = event.payload?.action ?? "updated";
    const issue = event.payload?.issue;
    const number = issue?.number ? `#${issue.number}` : "Issue";
    const actionText = capitalize(action);

    return {
      id: event.id,
      type: "issue",
      createdAt: event.created_at,
      title: `${actionText} issue ${number}`,
      subtitle: issue?.title ?? repoName,
      repo: repoName,
      url: issue?.html_url ?? getRepoUrl(repoName),
    };
  }

  if (event.type === "ReleaseEvent") {
    const action = event.payload?.action ?? "published";
    const release = event.payload?.release;
    const tag = release?.tag_name ?? "release";
    const actionText = capitalize(action);

    return {
      id: event.id,
      type: "release",
      createdAt: event.created_at,
      title: `${actionText} ${tag}`,
      subtitle: release?.name ?? repoName,
      repo: repoName,
      url: release?.html_url ?? getRepoUrl(repoName),
    };
  }

  return null;
}

async function fetchFormattedActivity(token: string): Promise<ActivityItem[]> {
  const events = (await fetchUserEvents(token)) as RawEvent[];

  return events
    .map(formatActivity)
    .filter((item): item is ActivityItem => item !== null)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

async function fetchPublicEvents(
  token: string,
  githubLogin: string
): Promise<RawEvent[]> {
  const response = await fetch(
    `${GITHUB_API}/users/${encodeURIComponent(githubLogin)}/events/public?per_page=100`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error("GitHub API error");
  }

  return (await response.json()) as RawEvent[];
}

async function fetchFormattedActivityWithFallback(
  token: string,
  githubLogin?: string
): Promise<ActivityItem[]> {
  try {
    return await fetchFormattedActivity(token);
  } catch {
    if (!githubLogin) {
      throw new Error("GitHub API error");
    }

    const events = await fetchPublicEvents(token, githubLogin);

    return events
      .map(formatActivity)
      .filter((item): item is ActivityItem => item !== null)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }
}

async function fetchActivityForAccount(
  token: string,
  githubLogin: string,
  cacheContext: { bypass: boolean; userId: string }
): Promise<ActivityItem[]> {
  const key = metricsCacheKey(cacheContext.userId, "activity", {
    githubLogin,
  });

  return withMetricsCache(
    {
      bypass: cacheContext.bypass,
      key,
      ttlSeconds: METRICS_CACHE_TTL_SECONDS.activity,
    },
    async () => {
      return fetchFormattedActivityWithFallback(token, githubLogin);
    }
  );
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken || !session.githubLogin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accountId = req.nextUrl.searchParams.get("accountId");
  const bypass = isMetricsCacheBypassed(req);

  if (!accountId) {
    try {
      const items = await fetchActivityForAccount(
        session.accessToken,
        session.githubLogin,
        { bypass, userId: session.githubId ?? session.githubLogin }
      );
      return Response.json({ items: items.slice(0, 20) });
    } catch {
      return Response.json({ error: "GitHub API error" }, { status: 502 });
    }
  }

  if (!session.githubId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userRow = await resolveAppUser(session.githubId, session.githubLogin);

  if (!userRow) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (accountId === "combined") {
    const accounts = await getAllAccounts(
      {
        token: session.accessToken,
        githubId: session.githubId,
        githubLogin: session.githubLogin,
      },
      userRow.id
    );

    const results = await Promise.allSettled(
      accounts.map((account) =>
        fetchActivityForAccount(account.token, account.githubLogin, {
          bypass,
          userId: account.githubId,
        })
      )
    );

    const merged = results
      .filter(
        (result): result is PromiseFulfilledResult<ActivityItem[]> =>
          result.status === "fulfilled"
      )
      .flatMap((result) => result.value)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 15);

    if (merged.length === 0 && results.length > 0) {
      const allFailed = results.every((result) => result.status === "rejected");
      if (allFailed) {
        return Response.json({ error: "GitHub API error" }, { status: 502 });
      }
    }

    return Response.json({ items: merged });
  }

  if (accountId === session.githubId) {
    try {
      const items = await fetchActivityForAccount(
        session.accessToken,
        session.githubLogin,
        { bypass, userId: session.githubId }
      );
      return Response.json({ items: items.slice(0, 15) });
    } catch {
      return Response.json({ error: "GitHub API error" }, { status: 502 });
    }
  }

  const token = await getAccountToken(userRow.id, accountId);

  if (!token) {
    return Response.json({ error: "Account not found" }, { status: 404 });
  }

  const { data: accountRow } = await supabaseAdmin
    .from("user_github_accounts")
    .select("github_login")
    .eq("user_id", userRow.id)
    .eq("github_id", accountId)
    .single();

  if (!accountRow?.github_login) {
    return Response.json({ error: "Account not found" }, { status: 404 });
  }

  try {
    const items = await fetchActivityForAccount(
      token,
      accountRow.github_login,
      { bypass, userId: accountId }
    );
    return Response.json({ items: items.slice(0, 15) });
  } catch {
    return Response.json({ error: "GitHub API error" }, { status: 502 });
  }
}
