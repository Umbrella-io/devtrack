import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

const GITHUB_API = "https://api.github.com";

interface RepoItem {
  repository: { full_name: string };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken || !session.githubLogin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const headers = {
    Authorization: `Bearer ${session.accessToken}`,
    Accept: "application/vnd.github+json",
  };

  // Fetch recent commits to discover the user's active repos (same approach as repos route)
  const since = new Date();
  since.setDate(since.getDate() - 90);
  const sinceStr = since.toISOString().slice(0, 10);

  const searchRes = await fetch(
    `${GITHUB_API}/search/commits?q=author:${session.githubLogin}+author-date:>=${sinceStr}&per_page=100&sort=author-date&order=desc`,
    { headers, cache: "no-store" }
  );

  if (!searchRes.ok) {
    return Response.json({ error: "GitHub API error" }, { status: 502 });
  }

  const data = (await searchRes.json()) as { items: RepoItem[] };

  // Deduplicate repo names
  const repoNames = Array.from(new Set(data.items.map((i) => i.repository.full_name)));

  // Fetch language breakdown for each repo
  const langTotals: Record<string, number> = {};

  await Promise.all(
    repoNames.map(async (repoName) => {
      try {
        const res = await fetch(`${GITHUB_API}/repos/${repoName}/languages`, {
          headers,
          cache: "no-store",
        });
        if (!res.ok) return;
        const langs = (await res.json()) as Record<string, number>;
        for (const [lang, bytes] of Object.entries(langs)) {
          langTotals[lang] = (langTotals[lang] ?? 0) + bytes;
        }
      } catch {
        // Skip repos that fail
      }
    })
  );

  const totalBytes = Object.values(langTotals).reduce((s, b) => s + b, 0);

  const languages = Object.entries(langTotals)
    .map(([name, bytes]) => ({
      name,
      bytes,
      percentage: totalBytes > 0 ? Math.round((bytes / totalBytes) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 6);

  return Response.json({ languages });
}
