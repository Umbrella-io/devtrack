/**
 * Activity formatter utilities extracted from the metrics/activity route.
 *
 * Keeping these in a standalone module allows unit tests to import the
 * pure formatting logic without pulling in Next.js route machinery (which
 * only permits the HTTP-verb exports GET/POST/etc. from route files).
 */

export type ActivityType = "push" | "pull_request" | "issue" | "release" | "other";

export interface ActivityItem {
  id: string;
  type: ActivityType;
  createdAt: string;
  title: string;
  subtitle: string;
  repo: string;
  url: string;
}

export interface RawEvent {
  id: string;
  type: string;
  created_at: string;
  repo?: { name?: string };
  payload?: {
    ref?: string;
    head?: string;
    action?: string;
    commits?: Array<{ sha?: string }>;
    pull_request?: {
      html_url?: string;
      number?: number;
      title?: string;
      merged?: boolean;
    };
    issue?: {
      html_url?: string;
      number?: number;
      title?: string;
    };
    release?: {
      html_url?: string;
      tag_name?: string;
      name?: string;
    };
  };
}

export const SUPPORTED_EVENT_TYPES = new Set([
  "PushEvent",
  "PullRequestEvent",
  "IssuesEvent",
  "ReleaseEvent",
]);

function getRepoUrl(repoName: string): string {
  return `https://github.com/${repoName}`;
}

function capitalize(value: string): string {
  return value.length > 0 ? value[0].toUpperCase() + value.slice(1) : "Updated";
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
