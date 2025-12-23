import { NextResponse } from "next/server";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { kv } from "@vercel/kv";
import { rateLimit } from "@/src/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Budget caps and kill-switch for paid acquisition
 */
export async function GET(req: Request) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const rl = await rateLimit(req, { kind: "auth", key: `admin:${session.user.id}` });
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: "Rate limit exceeded" }, { status: 429, headers: rl.headers });
  }

  try {
    const [dailyBudget, monthlyBudget, totalSpent, killSwitchEnabled] = await Promise.all([
      kv.get<number>("paid-acquisition:budget:daily"),
      kv.get<number>("paid-acquisition:budget:monthly"),
      kv.get<number>("paid-acquisition:spent:total"),
      kv.get<boolean>("paid-acquisition:kill-switch"),
    ]);

    return NextResponse.json({
      ok: true,
      dailyBudget: dailyBudget ?? 0,
      monthlyBudget: monthlyBudget ?? 0,
      totalSpent: totalSpent ?? 0,
      killSwitchEnabled: killSwitchEnabled ?? false,
    });
  } catch (error) {
    console.error("[paid-acquisition-budget] Error:", error);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const rl = await rateLimit(req, { kind: "auth", key: `admin:${session.user.id}` });
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: "Rate limit exceeded" }, { status: 429, headers: rl.headers });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { dailyBudget, monthlyBudget, killSwitch } = body;

    if (typeof dailyBudget === "number") {
      await kv.set("paid-acquisition:budget:daily", dailyBudget);
    }
    if (typeof monthlyBudget === "number") {
      await kv.set("paid-acquisition:budget:monthly", monthlyBudget);
    }
    if (typeof killSwitch === "boolean") {
      await kv.set("paid-acquisition:kill-switch", killSwitch);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[paid-acquisition-budget] Error:", error);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}

