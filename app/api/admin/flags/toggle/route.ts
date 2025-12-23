import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { setFlag, type FeatureFlag } from "@/src/lib/flags/flags";
import { logAdminAction } from "@/src/lib/audit/log";
import { rateLimitAdmin } from "@/src/lib/ratelimit/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  flag: z.string(),
  value: z.enum(["true", "false"]),
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
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  const flag = parsed.data.flag as FeatureFlag;
  const value = parsed.data.value === "true";

  try {
    await setFlag(flag, value);

    // Log the action
    await logAdminAction({
      actorUserId: session.user.id,
      action: "FLAG_TOGGLE",
      entityType: "FEATURE_FLAG",
      entityId: flag,
      metadata: { flag, value, previousValue: !value },
    });

    return NextResponse.json({ ok: true, flag, value }, { headers: rl.headers });
  } catch (error) {
    console.error("[flags] Error toggling flag:", error);
    return NextResponse.json({ ok: false, error: "Failed to toggle flag" }, { status: 500, headers: rl.headers });
  }
}

