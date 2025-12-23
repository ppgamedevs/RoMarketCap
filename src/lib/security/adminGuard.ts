type GuardResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

const rateState = new Map<string, { count: number; resetAtMs: number }>();

export function requireAdminApiKey(req: Request): GuardResult {
  const expected = process.env.ADMIN_API_KEY;
  if (!expected) return { ok: false, status: 500, error: "ADMIN_API_KEY not configured" };

  const provided = req.headers.get("x-admin-api-key") ?? req.headers.get("authorization") ?? "";
  const token = provided.startsWith("Bearer ") ? provided.slice("Bearer ".length) : provided;
  if (!token || token !== expected) return { ok: false, status: 401, error: "Unauthorized" };

  return { ok: true };
}

export function rateLimitIp(req: Request, opts?: { limit?: number; windowMs?: number }): GuardResult {
  const limit = opts?.limit ?? 20;
  const windowMs = opts?.windowMs ?? 60_000;

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  const now = Date.now();
  const current = rateState.get(ip);
  if (!current || now >= current.resetAtMs) {
    rateState.set(ip, { count: 1, resetAtMs: now + windowMs });
    return { ok: true };
  }

  if (current.count >= limit) {
    return { ok: false, status: 429, error: "Rate limit exceeded" };
  }

  current.count += 1;
  return { ok: true };
}


