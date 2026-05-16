import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest } from "next/server";
import { ExplorerRepoCardData } from "@/lib/projectAnalytics";
import { percentageFromMap } from "@/lib/projectAnalyticsUtils";

const GITHUB_API = "https://api.github.com";
const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572A5",
  CSS: "#563d7c",
  HTML: "#e34c26",
  Go: "#00ADD8",
  Rust: "#dea584",
};

const colorFor = (name: string) => LANGUAGE_COLORS[name] ?? "#94a3b8";
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

async function fetchRepoActivity7d(fullName: string, token: string) {
  const since = new Date();
  since.setDate(since.getDate() - 6);
  since.setHours(0, 0, 0, 0);

  const buckets = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    return {
      key: d.toISOString().slice(0, 10),
      day: DAY_LABELS[d.getDay()],
      commits: 0,
    };
  });

  const bucketMap = new Map(buckets.map((b) => [b.key, b]));

  try {
    const commits7dRes = await fetch(
      `${GITHUB_API}/repos/${fullName}/commits?since=${since.toISOString()}&per_page=100`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
        },
        next: { revalidate: 300 },
      }
    );

    if (!commits7dRes.ok) {
      return buckets.map(({ day, commits }) => ({ day, commits }));
    }

    const commits = (await commits7dRes.json()) as Array<{
      commit?: { author?: { date?: string | null } | null } | null;
    }>;

    for (const item of commits) {
      const iso = item.commit?.author?.date;
      if (!iso) continue;
      const key = iso.slice(0, 10);
      const bucket = bucketMap.get(key);
      if (bucket) bucket.commits += 1;
    }

    return buckets.map(({ day, commits }) => ({ day, commits }));
  } catch {
    return buckets.map(({ day, commits }) => ({ day, commits }));
  }
}

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken || !session.githubLogin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = session.accessToken;

  const search = req.nextUrl.searchParams;
  const perPage = Math.min(Number(search.get("perPage") ?? 24), 30);

  const repoRes = await fetch(
    `${GITHUB_API}/user/repos?sort=updated&direction=desc&per_page=${perPage}&type=all`,
    {
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      Accept: "application/vnd.github+json",
    },
    cache: "no-store",
  }
  );

  if (!repoRes.ok) {
    return Response.json({ error: "Failed to fetch repositories" }, { status: 502 });
  }

  const repos = (await repoRes.json()) as Array<{
    id: number;
    name: string;
    full_name: string;
    description: string | null;
    html_url: string;
    language: string | null;
    created_at: string;
    updated_at: string;
    owner: { login: string };
  }>;

  const cards = await Promise.all(
    repos.map(async (repo): Promise<ExplorerRepoCardData> => {
      const [languagesRes, commitsRes, activity7d] = await Promise.all([
        fetch(`${GITHUB_API}/repos/${repo.full_name}/languages`, {
          headers: { Authorization: `Bearer ${session.accessToken}`, Accept: "application/vnd.github+json" },
          cache: "no-store",
        }),
        fetch(`${GITHUB_API}/repos/${repo.full_name}/commits?per_page=1`, {
          headers: { Authorization: `Bearer ${session.accessToken}`, Accept: "application/vnd.github+json" },
          cache: "no-store",
        }),
        fetchRepoActivity7d(repo.full_name, token),
      ]);

      const rawLanguages = languagesRes.ok ? ((await languagesRes.json()) as Record<string, number>) : {};
      const languageBreakdown = percentageFromMap(rawLanguages).slice(0, 4).map((item) => ({ ...item, color: colorFor(item.name) }));

      const linkHeader = commitsRes.headers.get("Link");
      const commitCount =
        Number(linkHeader?.match(/page=(\d+)>; rel=\"last\"/)?.[1] ?? 0) ||
        (commitsRes.ok ? 1 : 0);

      return {
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        htmlUrl: repo.html_url,
        primaryLanguage: repo.language,
        createdAt: repo.created_at,
        updatedAt: repo.updated_at,
        commitCount,
        activity7d,
        languageBreakdown,
      };
    })
  );

  return Response.json({ repos: cards.filter((repo) => Boolean(repo.fullName)) });
}
