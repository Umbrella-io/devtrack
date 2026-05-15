import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchIssuesMetrics } from "@/lib/github";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const metrics = await fetchIssuesMetrics(session.accessToken);
    return Response.json(metrics);
  } catch {
    return Response.json({ error: "GitHub API error" }, { status: 502 });
  }
}
