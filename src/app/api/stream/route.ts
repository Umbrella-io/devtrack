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

// Keepalive comment sent to prevent proxies from closing the connection on
// their idle timeout. Also provides an early signal if the client is gone
// (enqueue throws when the controller is already closed).
export const HEARTBEAT_INTERVAL_MS = 30_000;

// Close connections where no real data has been delivered for this long.
// This recycles slots occupied by zombie connections (tabs closed via network
// interruption, proxies that dropped the TCP stream without notifying the
// server, etc.). The browser EventSource reconnects within seconds.
export const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

// Hard ceiling on how long a single stream connection may remain open,
// regardless of activity. Forces a clean reconnect and prevents state from
// accumulating in very long-lived connections.
export const MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes

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
  let lastDataSentAt = Date.now();
  let isClosed = false;

  const stream = new ReadableStream({
    start(controller) {
      // Declare handles up-front so closeStream can clear them regardless of
      // which close path fires first (abort, idle, max-age).
      let pollInterval: ReturnType<typeof setInterval>;
      let heartbeatInterval: ReturnType<typeof setInterval>;
      let idleCheckInterval: ReturnType<typeof setInterval>;
      let maxAgeTimer: ReturnType<typeof setTimeout>;

      // Guard: ensures the connection slot is decremented exactly once even if
      // multiple close paths race (e.g. abort fires while idle timeout fires).
      let cleanedUp = false;
      function releaseSlot() {
        if (cleanedUp) return;
        cleanedUp = true;
        const remaining = activeStreamConnections.get(userId) ?? 1;
        if (remaining <= 1) {
          activeStreamConnections.delete(userId);
        } else {
          activeStreamConnections.set(userId, remaining - 1);
        }
      }

      function closeStream() {
        if (isClosed) return;
        isClosed = true;
        clearInterval(pollInterval);
        clearInterval(heartbeatInterval);
        clearInterval(idleCheckInterval);
        clearTimeout(maxAgeTimer);
        try {
          controller.close();
        } catch (_) {
          // already closed
        }
        releaseSlot();
      }

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
            lastDataSentAt = Date.now();
          }
        } catch (error) {
          console.error("SSE Polling Error:", error);
        }
      };

      // Register all timers and the abort listener synchronously so they are
      // in place before any async work begins. This prevents a race where
      // abort() fires before the listener is attached.
      pollInterval = setInterval(() => {
        if (!isClosed) checkData();
      }, POLL_INTERVAL_MS);

      // Keepalive comment — invisible to message handlers, keeps the TCP
      // stream alive through intermediate proxies.
      heartbeatInterval = setInterval(() => {
        if (isClosed) return;
        try {
          controller.enqueue(": heartbeat\n\n");
        } catch (_) {
          // If enqueue throws the controller is already closed; clean up.
          closeStream();
        }
      }, HEARTBEAT_INTERVAL_MS);

      // Idle timeout — close connections that have sent no real data for
      // IDLE_TIMEOUT_MS. Frees slots held by zombie connections.
      idleCheckInterval = setInterval(() => {
        if (isClosed) return;
        if (Date.now() - lastDataSentAt > IDLE_TIMEOUT_MS) {
          closeStream();
        }
      }, 60_000);

      // Max-age ceiling — forcibly recycle the connection after MAX_AGE_MS.
      maxAgeTimer = setTimeout(closeStream, MAX_AGE_MS);

      req.signal.addEventListener("abort", closeStream);

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
