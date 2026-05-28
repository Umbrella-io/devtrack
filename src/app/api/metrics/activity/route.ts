import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";
import { authOptions } from "@/lib/auth";
import { getAccountToken, getAllAccounts } from "@/lib/github-accounts";
import { GITHUB_API, fetchUserEvents } from "@/lib/github";
import {
  isMetricsCacheBypassed,
  METRICS_CACHE_TTL_SECONDS,
  metricsCacheKey,
  withMetricsCache,
} from "@/lib/metrics-cache";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveAppUser } from "@/lib/resolve-user";
import {
  type ActivityItem,
  type RawEvent,
  formatActivity,
} from "@/lib/activity-formatter";

export const dynamic = "force-dynamic";

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

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken || !session.githubLogin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken: string = session.accessToken;
  const githubLogin: string = session.githubLogin;
  const accountId = req.nextUrl.searchParams.get("accountId");
  const bypass = isMetricsCacheBypassed(req);
  const cacheKey = metricsCacheKey(
    session.githubId ?? githubLogin,
    "activity",
    { accountId: accountId || undefined }
  );

  try {
    const result = await withMetricsCache(
      {
        bypass,
        key: cacheKey,
        ttlSeconds: METRICS_CACHE_TTL_SECONDS.activity,
      },
      async () => {
        if (!accountId) {
          const items = await fetchFormattedActivityWithFallback(
            accessToken,
            githubLogin
          );
          return { items: items.slice(0, 20) };
        }

        if (!session.githubId) {
          throw new Error("Unauthorized");
        }

        const userRow = await resolveAppUser(session.githubId, githubLogin);

        if (!userRow) {
          throw new Error("Unauthorized");
        }

        if (accountId === "combined") {
          const accounts = await getAllAccounts(
            {
              token: accessToken,
              githubId: session.githubId,
              githubLogin: githubLogin,
            },
            userRow.id
          );

          const results = await Promise.allSettled(
            accounts.map((account) =>
              fetchFormattedActivityWithFallback(
                account.token,
                account.githubLogin
              )
            )
          );

          const mergedActivities = results
            .filter(
              (result): result is PromiseFulfilledResult<ActivityItem[]> =>
                result.status === "fulfilled"
            )
            .flatMap((result) => result.value);

          const uniqueActivities = Array.from(
            new Map(
              mergedActivities.map((item) => [
                `${item.type}-${item.repo}-${item.createdAt}-${item.title}`,
                item,
              ])
            ).values()
          );

          const merged = uniqueActivities
            .sort(
              (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime()
            )
            .slice(0, 15);

          if (merged.length === 0 && results.length > 0) {
            const allFailed = results.every(
              (result) => result.status === "rejected"
            );
            if (allFailed) {
              throw new Error("GitHub API error");
            }
          }

          return { items: merged };
        }

        if (accountId === session.githubId) {
          const items = await fetchFormattedActivityWithFallback(
            accessToken,
            githubLogin
          );
          return { items: items.slice(0, 15) };
        }

        const token = await getAccountToken(userRow.id, accountId);

        if (!token) {
          throw new Error("Account not found");
        }

        const { data: accountRow } = await supabaseAdmin
          .from("user_github_accounts")
          .select("github_login")
          .eq("user_id", userRow.id)
          .eq("github_id", accountId)
          .single();

        if (!accountRow?.github_login) {
          throw new Error("Account not found");
        }

        const items = await fetchFormattedActivityWithFallback(
          token,
          accountRow.github_login
        );
        return { items: items.slice(0, 15) };
      }
    );

    return Response.json(result);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (error.message === "Account not found") {
        return Response.json({ error: "Account not found" }, { status: 404 });
      }
    }
    return Response.json({ error: "GitHub API error" }, { status: 502 });
  }
}
