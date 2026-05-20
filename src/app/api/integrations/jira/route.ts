import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveAppUser, AppUser } from "@/lib/resolve-user";
import { decryptToken } from "@/lib/crypto";

export const dynamic = "force-dynamic";

interface JiraIssue {
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

interface JiraCredentials {
  id: string;
  jira_domain: string;
  email: string;
  api_token: string;
  token_iv: string;
  project_key: string | null;
}

async function requireUser(): Promise<{ user: AppUser } | { error: Response }> {
  const session = await getServerSession(authOptions);

  if (!session?.githubId || !session?.githubLogin) {
    return { error: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const userRow = await resolveAppUser(session.githubId, session.githubLogin);

  if (!userRow) {
    return { error: Response.json({ error: "User not found" }, { status: 404 }) };
  }

  return { user: userRow };
}

function validateProjectKey(key: string): boolean {
  const projectKeyRegex = /^[A-Z][A-Z0-9]{0,9}$/;
  return projectKeyRegex.test(key);
}

async function fetchJiraIssues(
  domain: string,
  email: string,
  token: string,
  projectKey?: string
): Promise<JiraIssue[]> {
  const auth = Buffer.from(`${email}:${token}`).toString("base64");
  const headers = {
    Authorization: `Basic ${auth}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  let jql = "project is not EMPTY ORDER BY updated DESC";
  if (projectKey) {
    if (!validateProjectKey(projectKey)) {
      throw new Error("Invalid project key format");
    }
    jql = `project = ${projectKey} ORDER BY updated DESC`;
  }

  const searchUrl = `https://${domain}/rest/api/3/search?jql=${encodeURIComponent(
    jql
  )}&maxResults=50&fields=summary,status,created,updated,resolutiondate,assignee,priority`;

  const response = await fetch(searchUrl, {
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Jira API error: ${response.status}`);
  }

  const data = await response.json();

  return (data.issues || []).map((issue: any) => ({
    key: issue.key,
    summary: issue.fields.summary,
    status: issue.fields.status.name,
    statusCategory: issue.fields.status.statusCategory.key,
    created: issue.fields.created,
    updated: issue.fields.updated,
    resolved: issue.fields.resolutiondate,
    assignee: issue.fields.assignee?.displayName || null,
    priority: issue.fields.priority?.name || "Medium",
  }));
}

export function categorizeStatus(issue: JiraIssue): string {
  if (issue.statusCategory === "done") {
    return "Done";
  }
  if (issue.statusCategory === "indeterminate") {
    return "In Progress";
  }
  return "To Do";
}

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

export async function GET(req: NextRequest) {
  const result = await requireUser();
  if ("error" in result) return result.error;

  const { data: credentials, error } = await supabaseAdmin
    .from("jira_credentials")
    .select("*")
    .eq("user_id", result.user.id)
    .eq("is_active", true)
    .limit(1)
    .single();

  if (error || !credentials) {
    return Response.json(
      { error: "No Jira account connected" },
      { status: 404 }
    );
  }

  const cred = credentials as unknown as JiraCredentials;

  let decryptedToken: string;
  try {
    decryptedToken = decryptToken(cred.api_token, cred.token_iv);
  } catch {
    return Response.json(
      { error: "Failed to decrypt credentials" },
      { status: 500 }
    );
  }

  try {
    const issues = await fetchJiraIssues(
      cred.jira_domain,
      cred.email,
      decryptedToken,
      cred.project_key || undefined
    );

    const metrics = calculateMetrics(issues);

    return Response.json({
      metrics,
      recentIssues: issues.slice(0, 10),
    });
  } catch (err) {
    return Response.json(
      { error: "Failed to fetch Jira data" },
      { status: 502 }
    );
  }
}