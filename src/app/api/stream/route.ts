import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sseConnections } from "@/lib/sse";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.githubId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return new Response("userId is required", { status: 400 });
  }

  // Verify the requested userId matches the session
  if (userId !== session.githubId) {
    return new Response("Forbidden", { status: 403 });
  }

  const stream = new ReadableStream({
    start(controller) {
      sseConnections.set(userId, controller);
      controller.enqueue(
        `event: connected\ndata: ${JSON.stringify({ message: "SSE connected" })}\n\n`
      );
      req.signal.addEventListener("abort", () => {
        sseConnections.delete(userId);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}