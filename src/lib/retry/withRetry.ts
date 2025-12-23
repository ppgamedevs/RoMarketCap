type RetryOptions = {
  maxRetries?: number;
  initialDelay?: number; // ms
  maxDelay?: number; // ms
  backoffFactor?: number;
  retryable?: (error: unknown) => boolean;
};

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_INITIAL_DELAY = 1000; // 1 second
const DEFAULT_MAX_DELAY = 30000; // 30 seconds
const DEFAULT_BACKOFF_FACTOR = 2;

/**
 * Execute a function with exponential backoff retry.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const initialDelay = options.initialDelay ?? DEFAULT_INITIAL_DELAY;
  const maxDelay = options.maxDelay ?? DEFAULT_MAX_DELAY;
  const backoffFactor = options.backoffFactor ?? DEFAULT_BACKOFF_FACTOR;
  const retryable = options.retryable ?? (() => true);

  let lastError: unknown;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries || !retryable(error)) {
        throw error;
      }

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * backoffFactor, maxDelay);
    }
  }

  throw lastError;
}

/**
 * Check if an error is retryable (network errors, timeouts, 5xx).
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes("timeout") || message.includes("network") || message.includes("econnreset")) {
      return true;
    }

    // Check for HTTP errors
    const httpError = error as { status?: number; statusCode?: number };
    const status = httpError.status ?? httpError.statusCode;
    if (status != null && status >= 500) {
      return true;
    }
  }

  return false;
}

