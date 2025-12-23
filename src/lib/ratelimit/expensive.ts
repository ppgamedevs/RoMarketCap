import { kv } from "@vercel/kv";
import { Ratelimit } from "@upstash/ratelimit";

/**
 * Stricter rate limiters for expensive endpoints.
 */

// Expensive endpoint limiter: lower limits for anon, higher for auth/premium
const expensiveAnonLimiter = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(5, "1 m"), // 5 requests per minute for anonymous
  analytics: true,
  prefix: "rl:expensive:anon",
});

const expensiveAuthLimiter = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(30, "1 m"), // 30 requests per minute for authenticated
  analytics: true,
  prefix: "rl:expensive:auth",
});

const expensivePremiumLimiter = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(60, "1 m"), // 60 requests per minute for premium
  analytics: true,
  prefix: "rl:expensive:premium",
});

function ipFromRequest(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

function asHeaders(limit: number, remaining: number, resetMs: number): Record<string, string> {
  const resetSeconds = Math.ceil(resetMs / 1000);
  return {
    "RateLimit-Limit": String(limit),
    "RateLimit-Remaining": String(Math.max(0, remaining)),
    "RateLimit-Reset": String(resetSeconds),
  };
}

export type ExpensiveRateLimitResult =
  | {
      ok: true;
      headers: Record<string, string>;
    }
  | {
      ok: false;
      headers: Record<string, string>;
      retryAfterSeconds: number;
    };

/**
 * Rate limit for expensive endpoints (premium, forecast, report, search).
 * Stricter limits than standard endpoints.
 */
export async function rateLimitExpensive(
  req: Request,
  opts: { kind: "anon" | "auth" | "premium"; key?: string },
): Promise<ExpensiveRateLimitResult> {
  const identity = opts.key ?? ipFromRequest(req);
  const limiter =
    opts.kind === "premium"
      ? expensivePremiumLimiter
      : opts.kind === "auth"
        ? expensiveAuthLimiter
        : expensiveAnonLimiter;
  const result = await limiter.limit(identity);
  const headers = asHeaders(result.limit, result.remaining, result.reset);

  if (!result.success) {
    const retryAfterSeconds = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
    return {
      ok: false,
      retryAfterSeconds,
      headers: { ...headers, "Retry-After": String(retryAfterSeconds) },
    };
  }

  return { ok: true, headers };
}

