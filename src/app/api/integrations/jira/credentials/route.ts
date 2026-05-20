import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveAppUser } from "@/lib/resolve-user";

export const dynamic = "force-dynamic";

interface JiraCredentialsInput {
  jiraDomain: string;
  email: string;
  apiToken: string;
  projectKey?: string;
}

async function testJiraConnection(
  domain: string,
  email: string,
  token: string
): Promise<boolean> {
  const auth = Buffer.from(`${email}:${token}`).toString("base64");
  const response = await fetch(`https://${domain}/rest/api/3/myself`, {
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });
  return response.ok;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.githubId || !session?.githubLogin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userRow = await resolveAppUser(
    session.githubId,
    session.githubLogin
  );

  if (!userRow) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const { data: credentials } = await supabaseAdmin
    .from("jira_credentials")
    .select("id, jira_domain, email, project_key, is_active, created_at")
    .eq("user_id", userRow.id);

  return Response.json({ credentials: credentials || [] });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.githubId || !session?.githubLogin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userRow = await resolveAppUser(
    session.githubId,
    session.githubLogin
  );

  if (!userRow) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  let body: JiraCredentialsInput;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { jiraDomain, email, apiToken, projectKey } = body;

  if (!jiraDomain || !email || !apiToken) {
    return Response.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const valid = await testJiraConnection(jiraDomain, email, apiToken);
  if (!valid) {
    return Response.json(
      { error: "Could not connect to Jira with provided credentials" },
      { status: 400 }
    );
  }

  await supabaseAdmin.from("jira_credentials").upsert(
    {
      user_id: userRow.id,
      jira_domain: jiraDomain,
      email,
      api_token: apiToken,
      project_key: projectKey || null,
      is_active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  return Response.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.githubId || !session?.githubLogin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userRow = await resolveAppUser(
    session.githubId,
    session.githubLogin
  );

  if (!userRow) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const credentialId = searchParams.get("id");

  if (credentialId) {
    await supabaseAdmin
      .from("jira_credentials")
      .delete()
      .eq("id", credentialId)
      .eq("user_id", userRow.id);
  } else {
    await supabaseAdmin
      .from("jira_credentials")
      .delete()
      .eq("user_id", userRow.id);
  }

  return Response.json({ success: true });
}