import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { GITHUB_API } from "@/lib/github";

export const dynamic = "force-dynamic";

interface WrappedData {
  year: number;
  totalCommits: number;
  longestStreak: number;
  productiveMonth: { month: string; count: number };
  topLanguages: { name: string; color: string; size: number }[];
  totalMergedPRs: number;
  topRepo: string;
  peakHour: number | null; // 0-23
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken || !session.githubLogin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const yearParam = req.nextUrl.searchParams.get("year");
  const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();

  if (!Number.isFinite(year) || year < 1970 || year > 2100) {
    return NextResponse.json({ error: "Invalid year" }, { status: 400 });
  }

  const from = `${year}-01-01T00:00:00Z`;
  const to = `${year}-12-31T23:59:59Z`;
  const token = session.accessToken;
  const login = session.githubLogin;

  try {
    const query = `
      query($login: String!, $from: DateTime!, $to: DateTime!) {
        user(login: $login) {
          contributionsCollection(from: $from, to: $to) {
            totalCommitContributions
            contributionCalendar {
              weeks {
                contributionDays {
                  date
                  contributionCount
                }
              }
            }
            commitContributionsByRepository(maxRepositories: 10) {
              contributions {
                totalCount
              }
              repository {
                nameWithOwner
                languages(first: 3, orderBy: {field: SIZE, direction: DESC}) {
                  edges {
                    size
                    node {
                      name
                      color
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const [graphqlRes, prSearchRes] = await Promise.all([
      fetch("https://api.github.com/graphql", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query, variables: { login, from, to } }),
        cache: "no-store",
      }),
      fetch(`${GITHUB_API}/search/issues?q=type:pr+author:${login}+is:merged+created:${year}-01-01..${year}-12-31&per_page=1`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      })
    ]);

    if (!graphqlRes.ok) throw new Error("GraphQL failed");

    const gqlData = await graphqlRes.json();
    const collection = gqlData?.data?.user?.contributionsCollection;

    const totalCommits = collection?.totalCommitContributions || 0;
    
    // PRs
    let totalMergedPRs = 0;
    if (prSearchRes.ok) {
      const prData = await prSearchRes.json();
      totalMergedPRs = prData.total_count || 0;
    }

    // Calendar logic (streaks, productive month)
    let longestStreak = 0;
    let currentStreak = 0;
    const monthCounts: Record<string, number> = {};

    const weeks = collection?.contributionCalendar?.weeks || [];
    for (const week of weeks) {
      for (const day of week.contributionDays) {
        if (day.contributionCount > 0) {
          currentStreak++;
          longestStreak = Math.max(longestStreak, currentStreak);
        } else {
          currentStreak = 0;
        }

        const dateObj = new Date(day.date);
        const month = dateObj.toLocaleString('en-US', { month: 'long' });
        monthCounts[month] = (monthCounts[month] || 0) + day.contributionCount;
      }
    }

    let mostProductiveMonth = { month: "None", count: 0 };
    for (const [month, count] of Object.entries(monthCounts)) {
      if (count > mostProductiveMonth.count) {
        mostProductiveMonth = { month, count };
      }
    }

    // Top repo and languages
    const repos = collection?.commitContributionsByRepository || [];
    const topRepo = repos.length > 0 ? repos[0].repository.nameWithOwner : "None";

    const languageMap: Record<string, { size: number, color: string }> = {};
    for (const repoContrib of repos) {
      const edges = repoContrib.repository.languages?.edges || [];
      for (const edge of edges) {
        const name = edge.node.name;
        if (!languageMap[name]) {
          languageMap[name] = { size: 0, color: edge.node.color || "#ccc" };
        }
        languageMap[name].size += edge.size;
      }
    }

    const topLanguages = Object.entries(languageMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.size - a.size)
      .slice(0, 3);

    // Peak hour
    let peakHour = null;
    let allCommitItems: any[] = [];
    let page = 1;
    while (page <= 10) {
      const commitRes = await fetch(`${GITHUB_API}/search/commits?q=author:${login}+author-date:${year}-01-01..${year}-12-31&per_page=100&page=${page}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
        cache: "no-store",
      });
      if (!commitRes.ok) break;
      const data = await commitRes.json();
      const items = data.items || [];
      allCommitItems = allCommitItems.concat(items);
      if (items.length < 100) break;
      page++;
    }

    if (allCommitItems.length > 0) {
      const hourCounts: Record<number, number> = {};
      for (const item of allCommitItems) {
        const date = new Date(item.commit.author.date);
        const h = date.getUTCHours();
        hourCounts[h] = (hourCounts[h] || 0) + 1;
      }
      let maxCount = -1;
      for (const [hour, count] of Object.entries(hourCounts)) {
        if (count > maxCount) {
          maxCount = count;
          peakHour = parseInt(hour, 10);
        }
      }
    }

    const wrappedData: WrappedData = {
      year,
      totalCommits,
      longestStreak,
      productiveMonth: mostProductiveMonth,
      topLanguages,
      totalMergedPRs,
      topRepo,
      peakHour,
    };

    return NextResponse.json(wrappedData);

  } catch (error) {
    console.error("Wrapped API Error:", error);
    return NextResponse.json({ error: "Failed to generate wrapped data" }, { status: 500 });
  }
}
