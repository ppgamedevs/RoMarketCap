import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { prisma } from "@/src/lib/db";
import { logAdminAction } from "@/src/lib/audit/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const BodySchema = z.object({
  status: z.enum(["NEW", "CONTACTED", "CLOSED"]),
});

export async function POST(req: Request, ctx: Ctx) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const form = await req.formData().catch(() => null);
  const status = form?.get("status");
  const parsed = BodySchema.safeParse({ status });
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });

  const { id } = await ctx.params;
  await prisma.partnerLead.update({ where: { id }, data: { status: parsed.data.status } });
  await logAdminAction({
    actorUserId: session.user.id,
    action: "partner_lead.status",
    entityType: "PartnerLead",
    entityId: id,
    metadata: { status: parsed.data.status },
  });
  return NextResponse.redirect(new URL("/admin/leads", req.url), 303);
}


