import { kv } from "@vercel/kv";
import { Ratelimit } from "@upstash/ratelimit";

type RateLimitResult =
  | {
      ok: true;
      headers: Record<string, string>;
    }
  | {
      ok: false;
      headers: Record<string, string>;
      retryAfterSeconds: number;
    };

const anonLimiter = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(20, "1 m"),
  analytics: true,
  prefix: "rl:anon",
});

const authLimiter = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(120, "1 m"),
  analytics: true,
  prefix: "rl:auth",
});

const premiumLimiter = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(240, "1 m"),
  analytics: true,
  prefix: "rl:premium",
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

export async function rateLimit(
  req: Request,
  opts: { kind: "anon" | "auth" | "free" | "premium"; key?: string },
): Promise<RateLimitResult> {
  const identity = opts.key ?? ipFromRequest(req);
  const limiter =
    opts.kind === "premium"
      ? premiumLimiter
      : opts.kind === "auth"
        ? authLimiter
        : anonLimiter; // free is treated as anonymous tier
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


