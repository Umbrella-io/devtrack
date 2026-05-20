import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withMetricsCache } from "@/lib/cache";

async function fetchPRMetrics(token: string, githubLogin: string) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const dateString = thirtyDaysAgo.toISOString().split('T')[0];

  // Scoped to last 30 days for accurate semantics as requested
  const query = `search(type: ISSUE, query: "is:pr reviewed-by:${githubLogin} created:>=${dateString}", first: 100) {
    issueCount
  }`;

  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: `query { ${query} }` }),
  });

  const json = await response.json();
  const reviewsGiven = json.data?.search?.issueCount || 0;

  // Fetch total PRs authored by user to compute ratio cleanly
  const prQuery = `search(type: ISSUE, query: "is:pr author:${githubLogin} created:>=${dateString}", first: 1) {
    issueCount
  }`;
  
  const prResponse = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: `query { ${prQuery} }` }),
  });
  
  const prJson = await prResponse.json();
  const prsAuthored = prJson.data?.search?.issueCount || 0;
  
  const reviewRatio = prsAuthored > 0 ? parseFloat((reviewsGiven / prsAuthored).toFixed(2)) : 0;

  return {
    reviewsGiven,
    reviewRatio,
  };
}

export const GET = withMetricsCache(async (req: Request) => {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken || !session?.githubLogin) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    // Completely removed the insecure query parameter setup
    const primaryMetrics = await fetchPRMetrics(session.accessToken, session.githubLogin);
    
    // Multi-account handler passing independent account contexts correctly
    const accounts = session.accounts || [];
    const auxiliaryMetrics = await Promise.all(
      accounts.map((account) => fetchPRMetrics(account.token, account.githubLogin))
    );

    const totalReviewsGiven = primaryMetrics.reviewsGiven + auxiliaryMetrics.reduce((acc, curr) => acc + curr.reviewsGiven, 0);
    const avgReviewRatio = auxiliaryMetrics.length > 0 
      ? parseFloat(((primaryMetrics.reviewRatio + auxiliaryMetrics.reduce((acc, curr) => acc + curr.reviewRatio, 0)) / (auxiliaryMetrics.length + 1)).toFixed(2))
      : primaryMetrics.reviewRatio;

    return NextResponse.json({
      reviewsGiven: totalReviewsGiven,
      reviewRatio: avgReviewRatio,
    });
  } catch (error) {
    return new NextResponse("Internal Error", { status: 500 });
  }
});

