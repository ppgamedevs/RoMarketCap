import { kv } from "@vercel/kv";

/**
 * Stricter rate limiter for admin routes.
 * Admin routes should have very tight limits to prevent abuse.
 */

type AdminRateLimitResult =
  | { ok: true; headers: HeadersInit }
  | { ok: false; status: 429; error: string; headers: HeadersInit };

function ipFromRequest(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

function asHeaders(limit: number, remaining: number, resetMs: number): Record<string, string> {
  return {
    "RateLimit-Limit": String(limit),
    "RateLimit-Remaining": String(remaining),
    "RateLimit-Reset": String(Math.ceil(resetMs / 1000)),
    "Retry-After": String(Math.ceil((resetMs - Date.now()) / 1000)),
  };
}

/**
 * Rate limit admin routes.
 * Very strict: 10 requests per minute per IP.
 */
export async function rateLimitAdmin(req: Request): Promise<AdminRateLimitResult> {
  const limit = 10; // 10 requests per minute
  const windowMs = 60_000; // 1 minute

  const ip = ipFromRequest(req);
  const key = `ratelimit:admin:${ip}`;

  try {
    const current = await kv.get<{ count: number; resetAt: number }>(key);
    const now = Date.now();

    if (!current || now >= current.resetAt) {
      // Reset window
      await kv.set(key, { count: 1, resetAt: now + windowMs }, { ex: Math.ceil(windowMs / 1000) });
      return {
        ok: true,
        headers: asHeaders(limit, limit - 1, now + windowMs),
      };
    }

    if (current.count >= limit) {
      return {
        ok: false,
        status: 429,
        error: "Rate limit exceeded",
        headers: asHeaders(limit, 0, current.resetAt),
      };
    }

    // Increment
    const updated = { count: current.count + 1, resetAt: current.resetAt };
    await kv.set(key, updated, { ex: Math.ceil((current.resetAt - now) / 1000) });

    return {
      ok: true,
      headers: asHeaders(limit, limit - updated.count, current.resetAt),
    };
  } catch (error) {
    console.error("[ratelimit:admin] Error:", error);
    // On error, allow the request (fail open for admin routes, but log)
    return {
      ok: true,
      headers: {},
    };
  }
}

