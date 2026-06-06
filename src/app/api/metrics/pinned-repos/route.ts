import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { GitHubAuthError, githubAuthErrorResponse } from "@/lib/github-fetch";

export const dynamic = "force-dynamic";

interface PinnedRepo {
  name: string;
  description: string | null;
  url: string;
  stargazerCount: number;
  forkCount: number;
  primaryLanguage: { name: string; color: string } | null;
}

const PINNED_REPOS_QUERY = `
  query {
    viewer {
      pinnedItems(first: 6, types: REPOSITORY) {
        nodes {
          ... on Repository {
            name
            description
            url
            stargazerCount
            forkCount
            primaryLanguage {
              name
              color
            }
          }
        }
      }
    }
  }
`;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.error === "TokenRevoked") {
    return githubAuthErrorResponse();
  }

  try {
    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify({ query: PINNED_REPOS_QUERY }),
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 401) return githubAuthErrorResponse();
      return Response.json({ error: "GitHub API error" }, { status: 502 });
    }

    const data = (await response.json()) as {
      data?: {
        viewer?: {
          pinnedItems?: {
            nodes?: Array<PinnedRepo | null | undefined>;
          };
        };
      };
    };

    const nodes = (data.data?.viewer?.pinnedItems?.nodes ?? []).filter(
      (node): node is PinnedRepo => node != null
    );

    return Response.json({ pinnedRepos: nodes });
  } catch (e) {
    return Response.json({ error: "GitHub API error" }, { status: 502 });
  }
}
