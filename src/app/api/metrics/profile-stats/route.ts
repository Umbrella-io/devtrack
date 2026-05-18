import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

const GITHUB_API = "https://api.github.com";

type GithubRepo = {
  stargazers_count: number;
  forks_count: number;
};

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken || !session.githubLogin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userRes = await fetch(`${GITHUB_API}/user`, {
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      Accept: "application/vnd.github+json",
    },
    cache: "no-store",
  });

  if (!userRes.ok) {
    return Response.json(
      { error: "Failed to fetch profile stats" },
      { status: 502 }
    );
  }

  const user = await userRes.json();

  const reposRes = await fetch(
    `${GITHUB_API}/user/repos?per_page=100&type=owner&sort=updated`,
    {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        Accept: "application/vnd.github+json",
      },
      cache: "no-store",
    }
  );

  if (!reposRes.ok) {
    return Response.json(
      { error: "Failed to fetch repo stats" },
      { status: 502 }
    );
  }

  const repos = (await reposRes.json()) as GithubRepo[];

  const totalStars = repos.reduce(
    (sum, repo) => sum + (repo.stargazers_count ?? 0),
    0
  );

  const totalForks = repos.reduce(
    (sum, repo) => sum + (repo.forks_count ?? 0),
    0
  );

  return Response.json({
    memberSince: user.created_at,
    publicRepos: user.public_repos,
    totalStars,
    totalForks,
    followers: user.followers,
  });
}