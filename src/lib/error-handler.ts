/**
 * Centralized error handling and logging utility for API routes
 * Provides consistent error logging with context
 */

interface ErrorLogContext {
  endpoint: string;
  operation: string;
  userId?: string;
  additionalContext?: Record<string, unknown>;
}

/**
 * Log an error with context information
 * Stack traces are only included in development mode for security
 * @param error - The error object or message
 * @param context - Context about where/why the error occurred
 */
export function logError(error: unknown, context: ErrorLogContext): void {
  const errorMessage =
    error instanceof Error ? error.message : String(error);
  const errorStack =
    process.env.NODE_ENV !== "production" && error instanceof Error
      ? error.stack
      : undefined;

  const logEntry = {
    timestamp: new Date().toISOString(),
    endpoint: context.endpoint,
    operation: context.operation,
    userId: context.userId,
    error: errorMessage,
    ...(errorStack && { stack: errorStack }),
    ...context.additionalContext,
  };

  // Log to console in development
  if (process.env.NODE_ENV === "development") {
    console.error(
      `[${logEntry.timestamp}] ${logEntry.endpoint} - ${logEntry.operation}:`,
      logEntry
    );
  } else {
    // In production, send to external logging service (e.g., Sentry, LogRocket)
    console.error(JSON.stringify(logEntry));
  }
}
