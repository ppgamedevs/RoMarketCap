import { NextResponse } from "next/server";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { rateLimitAdmin } from "@/src/lib/ratelimit/admin";
import { kv } from "@vercel/kv";
import { evaluateLaunchChecklist } from "@/src/lib/launch/checklist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // Rate limit admin routes
  const rl = await rateLimitAdmin(req);
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: rl.error }, { status: rl.status, headers: rl.headers });
  }

  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401, headers: rl.headers });
  }

  // Cache for 30 seconds
  const cacheKey = "launch:checklist:result";
  const cached = await kv.get<Awaited<ReturnType<typeof evaluateLaunchChecklist>>>(cacheKey).catch(() => null);
  if (cached) {
    return NextResponse.json({ ok: true, ...cached }, { headers: rl.headers });
  }

  const result = await evaluateLaunchChecklist();
  await kv.set(cacheKey, result, { ex: 30 }).catch(() => null);

  return NextResponse.json({ ok: true, ...result }, { headers: rl.headers });
}
