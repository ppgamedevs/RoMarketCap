type LogLevel = "info" | "warn" | "error" | "debug";

type LogContext = {
  requestId?: string;
  route?: string;
  userId?: string;
  errorName?: string;
  errorCode?: string | number;
  [key: string]: unknown;
};

/**
 * Structured logger that outputs JSON logs.
 */
class Logger {
  private requestId: string | null = null;

  setRequestId(requestId: string) {
    this.requestId = requestId;
  }

  clearRequestId() {
    this.requestId = null;
  }

  private log(level: LogLevel, message: string, context: LogContext = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      requestId: context.requestId ?? this.requestId ?? undefined,
      route: context.route,
      userId: context.userId,
      errorName: context.errorName,
      errorCode: context.errorCode,
      ...Object.fromEntries(
        Object.entries(context).filter(
          ([key]) => !["requestId", "route", "userId", "errorName", "errorCode"].includes(key),
        ),
      ),
    };

    const logLine = JSON.stringify(logEntry);
    console.log(logLine);
  }

  info(message: string, context?: LogContext) {
    this.log("info", message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log("warn", message, context);
  }

  error(message: string, error?: Error | unknown, context?: LogContext) {
    const errorContext: LogContext = {
      ...context,
      errorName: error instanceof Error ? error.name : undefined,
      errorCode: error instanceof Error ? (error as { code?: string | number }).code : undefined,
    };

    if (error instanceof Error) {
      errorContext.errorMessage = error.message;
      errorContext.errorStack = error.stack;
    }

    this.log("error", error instanceof Error ? error.message : String(error), errorContext);
  }

  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV === "development") {
      this.log("debug", message, context);
    }
  }
}

export const logger = new Logger();

/**
 * Generate a request ID (UUID-like).
 */
export function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

