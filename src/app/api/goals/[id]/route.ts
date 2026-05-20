import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveAppUser } from "@/lib/resolve-user";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.githubId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await resolveAppUser(session.githubId, session.githubLogin);
  if (!user) return Response.json({ error: "User not found" }, { status: 404 });

  // Only delete if the goal belongs to the authenticated user
  const { error } = await supabaseAdmin
    .from("goals")
    .delete()
    .eq("id", params.id)
    .eq("user_id", user.id);

  if (error) {
    return Response.json({ error: "Failed to delete goal" }, { status: 500 });
  }

  return Response.json({ success: true }, { status: 200 });
}
