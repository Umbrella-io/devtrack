import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";
import { authOptions } from "@/lib/auth";
import {
  getAccountToken,
  getAllAccounts,
  mergeMetrics,
} from "@/lib/github-accounts";
import { GITHUB_API } from "@/lib/github";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";
interface PullRequest {
  title: string;
  created_at: string;
  html_url: string;
  state: string;
}interface PRMetricsBase {
  open: number;
  merged: number;
  total: number;
  avgReviewHours: number;
  mergeRate: number;
  prs: PullRequest[];
}

async function fetchPRMetrics(token: string): Promise<PRMetricsBase> {

  
  const searchRes = await fetch(
    `${GITHUB_API}/search/issues?q=type:pr+author:@me&per_page=100`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }
  );

  if (!searchRes.ok) {
    throw new Error("GitHub API error");
  }

  const data = (await searchRes.json()) as {
    total_count: number;
items: Array<{
  title: string;
  state: string;
  created_at: string;
  closed_at: string | null;
  html_url: string;
}>;
  };

  const open = data.items.filter((pr) => pr.state === "open").length;
  const merged = data.items.filter((pr) => pr.state === "closed").length;

  const closedPRs = data.items.filter((pr) => pr.closed_at);
  const avgReviewMs =
    closedPRs.length > 0
      ? closedPRs.reduce(
          (sum, pr) =>
            sum +
            (new Date(pr.closed_at!).getTime() -
              new Date(pr.created_at).getTime()),
          0
        ) / closedPRs.length
      : 0;
      const prs = data.items.map((pr) => ({
  title: pr.title,
  created_at: pr.created_at,
  html_url: pr.html_url,
  state: pr.state,
}));

return {
  open,
  merged,
  total: data.total_count,
  avgReviewHours: Math.round(avgReviewMs / 3600000),
  mergeRate: data.total_count > 0 ? merged / data.total_count : 0,
  prs,
};
}

function formatPRMetrics(metrics: PRMetricsBase) {
  return {
    open: metrics.open,
    merged: metrics.merged,
    total: metrics.total,
    avgReviewHours: metrics.avgReviewHours,
    mergeRate:
      metrics.total > 0
        ? `${Math.round(metrics.mergeRate * 100)}%`
        : "0%",
    prs: metrics.prs,
  };
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accountId = req.nextUrl.searchParams.get("accountId");

  if (!accountId) {
    try {
      const result = await fetchPRMetrics(session.accessToken);
      return Response.json(formatPRMetrics(result));
    } catch {
      return Response.json({ error: "GitHub API error" }, { status: 502 });
    }
  }

  if (!session.githubId || !session.githubLogin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("github_id", session.githubId)
    .single();

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
      accounts.map((account) => fetchPRMetrics(account.token))
    );

    const merged = mergeMetrics(results, (a, b) => {
      const total = a.total + b.total;
      const mergedCount = a.merged + b.merged;
      const avgReviewHours =
        total > 0
          ? (a.avgReviewHours * a.total + b.avgReviewHours * b.total) / total
          : 0;

      return {
        open: a.open + b.open,
        prs: [...a.prs, ...b.prs],
        merged: mergedCount,
        total,
        avgReviewHours: Math.round(avgReviewHours * 10) / 10,
        mergeRate:
          total > 0 ? Math.round((mergedCount / total) * 100) / 100 : 0,
      };
    });

    if (!merged) {
      return Response.json({ error: "GitHub API error" }, { status: 502 });
    }

    return Response.json(formatPRMetrics(merged));
  }

  const token =
    accountId === session.githubId
      ? session.accessToken
      : await getAccountToken(userRow.id, accountId);

  if (!token) {
    return Response.json({ error: "Account not found" }, { status: 404 });
  }

  try {
    const result = await fetchPRMetrics(token);
    return Response.json(formatPRMetrics(result));
  } catch {
    return Response.json({ error: "GitHub API error" }, { status: 502 });
  }
}
