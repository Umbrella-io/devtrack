import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveAppUser } from "@/lib/resolve-user";
import { activeStreamConnections } from "@/lib/sse";

export const dynamic = "force-dynamic";

// Maximum number of concurrent SSE connections allowed per authenticated user.
// This prevents a single user's browser tabs from generating unbounded database
// load: each connection independently polls two tables on every tick.
const MAX_CONNECTIONS_PER_USER = 4;

// How often each connection polls the database. 15 s is fast enough for the
// data types involved (goal sync timestamps and unread notification counts)
// while being 7.5x cheaper per connection than the previous 2 s interval.
const POLL_INTERVAL_MS = 15_000;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.githubId || !session.githubLogin) {
    return new Response("Unauthorized", { status: 401 });
  }

  const user = await resolveAppUser(session.githubId, session.githubLogin);
  if (!user) {
    return new Response("User not found", { status: 404 });
  }

  const userId = user.id;

  // Enforce per-user connection cap before opening the stream.
  const current = activeStreamConnections.get(userId) ?? 0;
  if (current >= MAX_CONNECTIONS_PER_USER) {
    return new Response(
      JSON.stringify({ error: "Too many concurrent stream connections" }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": "30",
        },
      }
    );
  }

  // Register this connection before the stream starts so that the count is
  // accurate even if two requests race during the check above.
  activeStreamConnections.set(userId, current + 1);

  let lastCheckedSyncedAt: string | null = null;
  let lastCheckedUnreadCount: number | null = null;

  let isClosed = false;

  const stream = new ReadableStream({
    start(controller) {
      const checkData = async () => {
        if (isClosed) return;
        try {
          const { data: goals } = await supabaseAdmin
            .from("goals")
            .select("last_synced_at")
            .eq("user_id", userId)
            .order("last_synced_at", { ascending: false })
            .limit(1);

          const currentSyncedAt = goals?.[0]?.last_synced_at || null;

          const { count } = await supabaseAdmin
            .from("notifications")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId)
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

          if (hasChanges && !isClosed) {
            controller.enqueue(`data: ${JSON.stringify(payload)}\n\n`);
          }
        } catch (error) {
          console.error("SSE Polling Error:", error);
        }
      };

      // Register the interval and abort handler synchronously so they are
      // guaranteed to be in place before any async work begins. This prevents
      // a race where abort() fires before the listener is attached.
      const interval = setInterval(() => {
        if (!isClosed) checkData();
      }, POLL_INTERVAL_MS);

      req.signal.addEventListener("abort", () => {
        isClosed = true;
        clearInterval(interval);
        try {
          controller.close();
        } catch (e) {
          // ignore already closed
        }

        // Decrement the connection counter so the slot becomes available again.
        const remaining = activeStreamConnections.get(userId) ?? 1;
        if (remaining <= 1) {
          activeStreamConnections.delete(userId);
        } else {
          activeStreamConnections.set(userId, remaining - 1);
        }
      });

      // Kick off the first poll immediately (non-blocking).
      checkData();
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
