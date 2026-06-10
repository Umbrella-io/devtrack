export interface JiraIssue {
  key: string;
  summary: string;
  status: string;
  statusCategory: string;
  created: string;
  updated: string;
  resolved: string | null;
  assignee: string | null;
  priority: string;
}

/**
 * Categorizes a Jira issue status into standard Kanban columns ("Done", "In Progress", or "To Do").
 * @param issue - The Jira issue object.
 * @returns The categorized status category string.
 */
export function categorizeStatus(issue: JiraIssue): string {
  if (issue.statusCategory === "done") {
    return "Done";
  }
  if (issue.statusCategory === "indeterminate") {
    return "In Progress";
  }
  return "To Do";
}

/**
 * Calculates summary metrics for a list of Jira issues, including counts per status category and average time to close.
 * @param issues - An array of Jira issues.
 * @returns An object containing the metrics summary.
 */
export function calculateMetrics(issues: JiraIssue[]) {
  const toDo = issues.filter(
    (i) => categorizeStatus(i) === "To Do"
  ).length;
  const inProgress = issues.filter(
    (i) => categorizeStatus(i) === "In Progress"
  ).length;
  const done = issues.filter((i) => categorizeStatus(i) === "Done").length;

  const resolvedIssues = issues.filter((i) => i.resolved !== null);
  let avgTimeToClose: number | null = null;

  if (resolvedIssues.length > 0) {
    const totalHours = resolvedIssues.reduce((sum, issue) => {
      const created = new Date(issue.created).getTime();
      const resolved = new Date(issue.resolved!).getTime();
      return sum + (resolved - created);
    }, 0);
    avgTimeToClose = Math.round(totalHours / resolvedIssues.length / 3600000);
  }

  return {
    total: issues.length,
    toDo,
    inProgress,
    done,
    avgTimeToClose,
  };
}
