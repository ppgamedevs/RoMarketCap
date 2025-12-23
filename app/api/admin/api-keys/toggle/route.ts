import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { prisma } from "@/src/lib/db";
import { logAdminAction } from "@/src/lib/audit/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({ id: z.string().min(1), active: z.boolean() });

export async function POST(req: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });

  await prisma.apiKey.update({ where: { id: parsed.data.id }, data: { active: parsed.data.active } });
  await logAdminAction({
    actorUserId: session.user.id,
    action: "apikey.toggle",
    entityType: "ApiKey",
    entityId: parsed.data.id,
    metadata: { active: parsed.data.active },
  });
  return NextResponse.json({ ok: true });
}


