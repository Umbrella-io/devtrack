export const sseConnections = new Map<string, ReadableStreamDefaultController>();

export function sendSSEEvent(
  userId: string,
  event: string,
  data: object
): void {
  const controller = sseConnections.get(userId);
  if (controller) {
    try {
      controller.enqueue(
        `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
      );
    } catch {
      sseConnections.delete(userId);
    }
  }
}
