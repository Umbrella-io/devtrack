import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// Sponsor identity must be tied to GitHub's immutable numeric account ID
// (databaseId / github_id) rather than the mutable login name. A user can
// rename their GitHub account at any time, and GitHub recycles usernames
// after a grace period. Matching on login would allow a new account that
// claims a recycled username to inherit sponsor privileges.

interface SponsorIdentity {
  githubId: string;  // immutable numeric ID stringified, matches users.github_id
  login: string;     // current login, kept for logging/response only
}

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}` && process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "No GitHub token configured" }, { status: 500 });
  }

  const targetOwner = "Priyanshu-byte-coder";

  try {
    // Request databaseId alongside login so we can match on the immutable
    // GitHub numeric account identifier rather than the mutable username.
    const query = `
      query {
        user(login: "${targetOwner}") {
          sponsorshipsAsMaintainer(first: 100) {
            nodes {
              sponsorEntity {
                ... on User {
                  databaseId
                  login
                }
                ... on Organization {
                  databaseId
                  login
                }
              }
            }
          }
        }
      }
    `;

    const res = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
      cache: "no-store",
    });

    if (!res.ok) {
      console.error("Failed to fetch sponsors:", res.status);
      return NextResponse.json({ error: "GitHub API error" }, { status: 502 });
    }

    const { data, errors } = await res.json();

    if (errors && errors.length > 0) {
      console.error("GraphQL errors:", errors);
      return NextResponse.json({ error: "GraphQL query failed" }, { status: 502 });
    }

    if (!data || !data.user) {
      console.error("GraphQL returned empty data or null user");
      return NextResponse.json({ error: "GraphQL query returned no user data" }, { status: 502 });
    }

    // Build the authoritative sponsor list keyed on immutable GitHub IDs.
    const currentSponsors: SponsorIdentity[] = [];

    if (data.user.sponsorshipsAsMaintainer?.nodes) {
      for (const node of data.user.sponsorshipsAsMaintainer.nodes) {
        const entity = node.sponsorEntity;
        if (entity?.databaseId) {
          currentSponsors.push({
            githubId: String(entity.databaseId),
            login: entity.login ?? "",
          });
        }
      }
    }

    const sponsorGithubIds = new Set(currentSponsors.map((s) => s.githubId));

    // Fetch the set of users currently marked as sponsors using their
    // immutable github_id, not their login.
    const { data: existingSponsors, error: fetchErr } = await supabaseAdmin
      .from("users")
      .select("github_id")
      .eq("is_sponsor", true);

    if (fetchErr) {
      console.error("Failed to fetch current sponsors:", fetchErr);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    const existingIds = new Set<string>(
      (existingSponsors ?? []).map((u: { github_id: string }) => u.github_id)
    );

    // Diff on immutable IDs.
    const toRevoke = [...existingIds].filter((id) => !sponsorGithubIds.has(id));
    const toGrant  = [...sponsorGithubIds].filter((id) => !existingIds.has(id));

    if (toRevoke.length > 0) {
      const { error } = await supabaseAdmin
        .from("users")
        .update({ is_sponsor: false })
        .in("github_id", toRevoke);

      if (error) {
        console.error("Failed to revoke sponsors:", error);
        return NextResponse.json({ error: "Database error" }, { status: 500 });
      }
    }

    if (toGrant.length > 0) {
      const { error } = await supabaseAdmin
        .from("users")
        .update({ is_sponsor: true })
        .in("github_id", toGrant);

      if (error) {
        console.error("Failed to grant sponsors:", error);
        return NextResponse.json({ error: "Database error" }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      sponsorCount: currentSponsors.length,
      granted: toGrant.length,
      revoked: toRevoke.length,
      sponsors: currentSponsors.map((s) => s.login),
    });
  } catch (error) {
    console.error("Error in sponsors sync:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
