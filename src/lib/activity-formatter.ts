const SUPPORTED_EVENT_TYPES = new Set([
  "PushEvent",
  "PullRequestEvent",
  "IssuesEvent",
  "ReleaseEvent",
]);
function getRepoUrl(repoName: string): string {
  return `https://github.com/${repoName}`;
}
export function formatActivity(event: RawEvent): ActivityItem | null {
  const repoName = event.repo?.name;

  if (!repoName || !SUPPORTED_EVENT_TYPES.has(event.type)) {
    return null;
  }

  if (event.type === "PushEvent") {
    const commitCount = event.payload?.commits?.length ?? 0;
    const rawRef = event.payload?.ref ?? "";
    const branch = rawRef.replace("refs/heads/", "") || "default branch";
    const plural = commitCount === 1 ? "" : "s";

    return {
      id: event.id,
      type: "push",
      createdAt: event.created_at,
      title: `Pushed ${commitCount} commit${plural} to ${branch}`,
      subtitle: repoName,
      repo: repoName,
      url: event.payload?.head
        ? `https://github.com/${repoName}/commit/${event.payload.head}`
        : getRepoUrl(repoName),
    };
  }

  if (event.type === "PullRequestEvent") {
    const action = event.payload?.action ?? "updated";
    const pr = event.payload?.pull_request;
    const number = pr?.number ? `#${pr.number}` : "PR";
    const wasMerged = action === "closed" && pr?.merged === true;
    const actionText = wasMerged ? "Merged" : capitalize(action);

    return {
      id: event.id,
      type: "pull_request",
      createdAt: event.created_at,
      title: `${actionText} pull request ${number}`,
      subtitle: pr?.title ?? repoName,
      repo: repoName,
      url: pr?.html_url ?? getRepoUrl(repoName),
    };
  }

  if (event.type === "IssuesEvent") {
    const action = event.payload?.action ?? "updated";
    const issue = event.payload?.issue;
    const number = issue?.number ? `#${issue.number}` : "Issue";
    const actionText = capitalize(action);

    return {
      id: event.id,
      type: "issue",
      createdAt: event.created_at,
      title: `${actionText} issue ${number}`,
      subtitle: issue?.title ?? repoName,
      repo: repoName,
      url: issue?.html_url ?? getRepoUrl(repoName),
    };
  }

  if (event.type === "ReleaseEvent") {
    const action = event.payload?.action ?? "published";
    const release = event.payload?.release;
    const tag = release?.tag_name ?? "release";
    const actionText = capitalize(action);

    return {
      id: event.id,
      type: "release",
      createdAt: event.created_at,
      title: `${actionText} ${tag}`,
      subtitle: release?.name ?? repoName,
      repo: repoName,
      url: release?.html_url ?? getRepoUrl(repoName),
    };
  }

  return null;
}