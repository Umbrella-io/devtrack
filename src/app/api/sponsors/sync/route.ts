import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "No GitHub token configured" }, { status: 500 });
  }

  const targetOwner = "Priyanshu-byte-coder";

  try {
    const query = `
      query {
        user(login: "${targetOwner}") {
          sponsorshipsAsMaintainer(first: 100) {
            nodes {
              sponsorEntity {
                ... on User {
                  login
                }
                ... on Organization {
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

    const { data } = await res.json();
    
    const sponsorLogins: string[] = [];
    
    if (data?.user?.sponsorshipsAsMaintainer?.nodes) {
      const nodes = data.user.sponsorshipsAsMaintainer.nodes;
      for (const node of nodes) {
        if (node.sponsorEntity?.login) {
          sponsorLogins.push(node.sponsorEntity.login);
        }
      }
    }

    // Reset all is_sponsor to false
    await supabaseAdmin
      .from("users")
      .update({ is_sponsor: false })
      .neq("is_sponsor", false);

    // Set is_sponsor = true for active sponsors
    if (sponsorLogins.length > 0) {
      await supabaseAdmin
        .from("users")
        .update({ is_sponsor: true })
        .in("github_login", sponsorLogins);
    }

    return NextResponse.json({ 
      success: true, 
      sponsorCount: sponsorLogins.length, 
      sponsors: sponsorLogins 
    });
  } catch (error) {
    console.error("Error in sponsors sync:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
