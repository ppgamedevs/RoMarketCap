import { NextResponse } from "next/server";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { prisma } from "@/src/lib/db";
import { rateLimitAdmin } from "@/src/lib/ratelimit/admin";

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

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") || "10000"), 50000);

  const logs = await prisma.adminAuditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { actor: { select: { email: true } } },
  });

  // Convert to CSV
  const headers = ["id", "createdAt", "actorEmail", "action", "entityType", "entityId", "prevHash", "metadata"];
  const rows = logs.map((log) => [
    log.id,
    log.createdAt.toISOString(),
    log.actor.email ?? "",
    log.action,
    log.entityType,
    log.entityId,
    log.prevHash ?? "",
    JSON.stringify(log.metadata ?? {}),
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))].join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="audit-log-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}

