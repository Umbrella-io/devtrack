import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveAppUser } from "@/lib/resolve-user";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.githubId || !session.githubLogin) {
    return new Response("Unauthorized", { status: 401 });
  }

  const user = await resolveAppUser(session.githubId, session.githubLogin);
  if (!user) {
    return new Response("User not found", { status: 404 });
  }

  let lastCheckedSyncedAt: string | null = null;
  let lastCheckedUnreadCount: number | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const checkData = async () => {
        try {
          const { data: goals } = await supabaseAdmin
            .from("goals")
            .select("last_synced_at")
            .eq("user_id", user.id)
            .order("last_synced_at", { ascending: false })
            .limit(1);

          const currentSyncedAt = goals?.[0]?.last_synced_at || null;

          const { count } = await supabaseAdmin
            .from("notifications")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("read", false);

          const currentUnreadCount = count ?? 0;

          let hasChanges = false;
          const payload: Record<string, unknown> = { type: "update" };

          if (lastCheckedSyncedAt !== currentSyncedAt) {
            hasChanges = true;
            payload.lastSyncedAt = currentSyncedAt;
            payload.syncTriggered = lastCheckedSyncedAt !== null;
            lastCheckedSyncedAt = currentSyncedAt;
          }

          if (lastCheckedUnreadCount !== currentUnreadCount) {
            hasChanges = true;
            payload.unreadCount = currentUnreadCount;
            lastCheckedUnreadCount = currentUnreadCount;
          }

          if (hasChanges) {
            controller.enqueue(`data: ${JSON.stringify(payload)}\n\n`);
          }
        } catch (error) {
          console.error("SSE Polling Error:", error);
        }
      };

      await checkData();

      const interval = setInterval(() => {
        checkData();
      }, 2000);

      req.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
