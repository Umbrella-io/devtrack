// ── 3. Sync each goal separately with paginated commit counting ───────────
const now = new Date().toISOString();

for (const goal of commitGoals) {
  let page = 1;
  let commitCount = 0;
  let hasMore = true;

  // Optional repository field (if present in DB)
  const repo =
    goal.repo ||
    goal.repository ||
    goal.repo_name ||
    null;

  while (hasMore) {
    const repoQualifier = repo ? `+repo:${repo}` : "";

    const ghRes = await fetch(
      `${GITHUB_API}/search/commits?q=author:${session.githubLogin}${repoQualifier}+author-date:${weekStart}..${weekEnd}&per_page=100&page=${page}`,
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          Accept: "application/vnd.github+json",
        },
        cache: "no-store",
      }
    );

    if (!ghRes.ok) {
      return Response.json(
        { error: "GitHub API error" },
        { status: 502 }
      );
    }

    const ghData = (await ghRes.json()) as {
      items?: unknown[];
    };

    const items = ghData.items || [];

    commitCount += items.length;

    if (items.length < 100) {
      hasMore = false;
    } else {
      page++;
    }
  }

  const { error: updateError } = await supabaseAdmin
    .from("goals")
    .update({
      current: commitCount,
      last_synced_at: now,
    })
    .eq("id", goal.id);

  if (updateError) {
    return Response.json(
      { error: "Failed to update goals" },
      { status: 500 }
    );
  }
}

return Response.json({
  updated: commitGoals.length,
});