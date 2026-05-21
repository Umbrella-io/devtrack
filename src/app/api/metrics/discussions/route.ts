import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

const GITHUB_API = "https://api.github.com";

interface DiscussionData {
  discussionsStarted: number;
  commentsGiven: number;
  markedAsAnswer: number;
}

async function fetchJson<T>(url: string, token: string): Promise<T> {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error("GitHub API error");
  return (await res.json()) as T;
}

async function fetchGraphQL<T>(
  query: string,
  token: string
): Promise<T> {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error("GitHub GraphQL error");
  const json = await res.json();
  return json.data as T;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken || !session.githubLogin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const login = session.githubLogin;
  const token = session.accessToken;

  try {
    // 1) Discussions started — REST search
    const discussionsRes = await fetchJson<{ total_count: number }>(
      `${GITHUB_API}/search/issues?q=author:${login}+type:discussion&per_page=1`,
      token
    );
    const discussionsStarted =
      typeof discussionsRes.total_count === "number"
        ? discussionsRes.total_count
        : 0;

    // 2) Discussion comments and marked-as-answer via GraphQL
    const query = `
      {
        user(login: "${login}") {
          contributionsCollection {
            totalCommitContributions
          }
        }
        search(query: "commenter:${login} type:discussion", type: DISCUSSION, first: 100) {
          discussionCount
        }
      }
    `;

    let commentsGiven = 0;
    let markedAsAnswer = 0;

    try {
      // GraphQL for marked-as-answer count
      const answersQuery = `
        {
          search(query: "answered-by:${login} type:discussion", type: DISCUSSION, first: 1) {
            discussionCount
          }
        }
      `;
      const answersData = await fetchGraphQL<{
        search: { discussionCount: number };
      }>(answersQuery, token);
      markedAsAnswer = answersData?.search?.discussionCount ?? 0;

      // GraphQL for comments given
      const commentsData = await fetchGraphQL<{
        search: { discussionCount: number };
      }>(query, token);
      commentsGiven = commentsData?.search?.discussionCount ?? 0;
    } catch {
      // GraphQL may not support discussion search — fallback to 0
    }

    const data: DiscussionData = {
      discussionsStarted,
      commentsGiven,
      markedAsAnswer,
    };

    return Response.json(data, {
      headers: {
        // cache for 5 minutes to avoid rate limit issues
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch {
    return Response.json({ error: "GitHub API error" }, { status: 502 });
  }
}