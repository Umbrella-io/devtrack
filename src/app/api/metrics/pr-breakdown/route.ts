import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

const GITHUB_API = "https://api.github.com";

interface PRItem {
  state: string;
  draft?: boolean;
  pull_request?: {
    merged_at: string | null;
  };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const res = await fetch(
    `${GITHUB_API}/search/issues?q=type:pr+author:@me&per_page=100`,
    {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        Accept: "application/vnd.github+json",
      },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    return Response.json({ error: "GitHub API error" }, { status: 502 });
  }

  const data = (await res.json()) as { items: PRItem[] };

  let draft = 0, open = 0, merged = 0, closed = 0;

  for (const pr of data.items) {
    if (pr.state === "open" && pr.draft) {
      draft++;
    } else if (pr.state === "open") {
      open++;
    } else if (pr.pull_request?.merged_at) {
      merged++;
    } else {
      closed++;
    }
  }

  return Response.json({ draft, open, merged, closed });
}
