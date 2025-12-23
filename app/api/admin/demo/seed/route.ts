import { NextResponse } from "next/server";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { rateLimitAdmin } from "@/src/lib/ratelimit/admin";
import { seedDemoCompanies } from "@/src/lib/demo/seed";
import { logAdminAction } from "@/src/lib/audit/log";
import { isDemoOperationsAllowed } from "@/src/lib/launch/mode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  // Block in launch mode
  if (!isDemoOperationsAllowed()) {
    return NextResponse.json({ ok: false, error: "Demo operations are disabled in launch mode" }, { status: 403, headers: rl.headers });
  }

  try {
    const result = await seedDemoCompanies();

    await logAdminAction({
      actorUserId: session.user.id,
      action: "DEMO_SEED",
      entityType: "DEMO",
      entityId: "seed",
      metadata: result,
    });

    if (result.skipped > 0 && result.created === 0) {
      return NextResponse.json(
        { ok: false, error: "Database is not empty. Demo seed only works when no companies exist." },
        { status: 400, headers: rl.headers },
      );
    }

    return NextResponse.json({ ok: true, message: `Created ${result.created} demo companies`, ...result }, { headers: rl.headers });
  } catch (error) {
    console.error("[demo:seed] Error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500, headers: rl.headers },
    );
  }
}
