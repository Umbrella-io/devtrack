/**
 * Maps known internal error codes to user-safe messages.
 * Only add entries whose messages are safe to display in production —
 * no stack traces, schema details, or token fragments.
 */
const SAFE_ERROR_MESSAGES: Readonly<Record<string, string>> = {
  TokenRevoked: "Your GitHub session has expired. Please sign in again.",
  Unauthorized: "You must be signed in to view this page.",
  "Configuration error": "There is a configuration issue. Please contact support.",
} as const;

/**
 * Returns a message that is safe to render in the UI.
 *
 * In production, any message not present in SAFE_ERROR_MESSAGES is replaced
 * with a generic string so that Supabase constraint names, table names, stack
 * traces, and token fragments are never exposed to the browser. In development
 * the raw message is shown to aid debugging.
 */
export function getSafeErrorMessage(error: Error & { digest?: string }): string {
  if (error.message in SAFE_ERROR_MESSAGES) {
    return SAFE_ERROR_MESSAGES[error.message];
  }
  if (process.env.NODE_ENV === "production") {
    return "An unexpected error occurred. Our team has been notified.";
  }
  return error.message || "Unknown error";
}

/**
 * Returns a message that is safe to include in a JSON API error response.
 * The logic mirrors getSafeErrorMessage but is kept separate so it can be
 * unit-tested without a DOM environment.
 */
export function getSafeApiErrorMessage(
  message: string,
  env: string = process.env.NODE_ENV ?? "production"
): string {
  if (message in SAFE_ERROR_MESSAGES) {
    return SAFE_ERROR_MESSAGES[message];
  }
  if (env === "production") {
    return "An unexpected error occurred.";
  }
  return message || "Unknown error";
}
