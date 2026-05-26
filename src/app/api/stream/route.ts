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
          // 1. Get max last_synced_at from goals
          const { data: goals } = await supabaseAdmin
            .from("goals")
            .select("last_synced_at")
            .eq("user_id", user.id)
            .order("last_synced_at", { ascending: false })
            .limit(1);

          const currentSyncedAt = goals?.[0]?.last_synced_at || null;

          // 2. Get unread notifications count
          const { count } = await supabaseAdmin
            .from("notifications")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("read", false);

          const currentUnreadCount = count ?? 0;

          let hasChanges = false;
          const payload: any = { type: "update" };

          if (lastCheckedSyncedAt !== currentSyncedAt) {
            hasChanges = true;
            payload.lastSyncedAt = currentSyncedAt;
            payload.syncTriggered = lastCheckedSyncedAt !== null; // true if this is an update, not the initial fetch
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

      // Initial check
      await checkData();

      const interval = setInterval(() => {
        checkData();
      }, 2000); // Poll DB every 2 seconds

      req.signal.addEventListener("abort", () => {
        clearInterval(interval);
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
