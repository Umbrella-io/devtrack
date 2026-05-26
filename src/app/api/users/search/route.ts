import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

const GITHUB_API = "https://api.github.com";
const MAX_RESULTS = 6;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const qRaw = req.nextUrl.searchParams.get("q") ?? "";
  const q = qRaw.trim();

  if (q.length < 2) {
    return Response.json({ users: [] });
  }

  // GitHub usernames can be up to 39 chars; keep query small to reduce load.
  if (q.length > 39) {
    return Response.json({ users: [] });
  }

  const searchRes = await fetch(
    `${GITHUB_API}/search/users?q=${encodeURIComponent(`${q} in:login`)}&per_page=${MAX_RESULTS}`,
    {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      cache: "no-store",
    }
  );

  if (!searchRes.ok) {
    return Response.json({ users: [] });
  }

  const data = (await searchRes.json()) as { items?: Array<{ login: string; avatar_url: string }> };
  const users = (data.items ?? []).map((u) => ({
    username: u.login,
    avatarUrl: u.avatar_url,
  }));

  return Response.json({ users });
}

