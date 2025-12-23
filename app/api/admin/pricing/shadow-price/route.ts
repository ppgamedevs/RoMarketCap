import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { rateLimitAdmin } from "@/src/lib/ratelimit/admin";
import { kv } from "@vercel/kv";
import { logAdminAction } from "@/src/lib/audit/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  price: z.string().nullable(),
});

export async function POST(req: Request) {
  // Rate limit admin routes
  const rl = await rateLimitAdmin(req);
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: rl.error }, { status: rl.status, headers: rl.headers });
  }

  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401, headers: rl.headers });
  }

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400, headers: rl.headers });
  }

  try {
    if (parsed.data.price) {
      await kv.set("pricing:shadow_price", parsed.data.price);
    } else {
      await kv.del("pricing:shadow_price");
    }

    await logAdminAction({
      actorUserId: session.user.id,
      action: "SHADOW_PRICE_UPDATE",
      entityType: "PRICING",
      entityId: "shadow_price",
      metadata: { price: parsed.data.price },
    });

    return NextResponse.json({ ok: true, price: parsed.data.price }, { headers: rl.headers });
  } catch (error) {
    console.error("[pricing:shadow-price] Error:", error);
    return NextResponse.json({ ok: false, error: "Failed to update shadow price" }, { status: 500, headers: rl.headers });
  }
}
