import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { validateTextInput } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

function currentWeekStart(): string {
  const now = new Date();
  const d = new Date(now);
  d.setDate(now.getDate() - now.getDay() + 1); // Monday
  return d.toISOString().slice(0, 10);
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.githubId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("github_id", session.githubId)
    .single();

  if (!user) return Response.json({ error: "User not found" }, { status: 404 });

  const { data: goals } = await supabaseAdmin
    .from("goals")
    .select("*")
    .eq("user_id", user.id)
    .eq("week_start", currentWeekStart());

  return Response.json({ goals: goals ?? [] });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.githubId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as { label?: unknown; target?: unknown };

  // --- Validate & sanitize label (strip HTML, enforce length) ---
  const labelResult = validateTextInput(body.label, "label", 100);
  if (!labelResult.ok) {
    return Response.json({ error: labelResult.error }, { status: 400 });
  }

  // --- Validate target (must be a positive integer) ---
  const target = Number(body.target);
  if (!Number.isInteger(target) || target < 1 || target > 365) {
    return Response.json(
      { error: "target must be an integer between 1 and 365" },
      { status: 400 }
    );
  }

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("github_id", session.githubId)
    .single();

  if (!user) return Response.json({ error: "User not found" }, { status: 404 });

  const { data: goal, error } = await supabaseAdmin
    .from("goals")
    .insert({
      user_id: user.id,
      label: labelResult.value,   // sanitized value stored, never raw input
      target,
      week_start: currentWeekStart(),
    })
    .select()
    .single();

  if (error) return Response.json({ error: "Failed to create goal" }, { status: 500 });

  return Response.json({ goal }, { status: 201 });
}