import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/src/lib/db";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { sendEmail } from "@/src/lib/email/resend";
import { moderationResultEmail } from "@/src/lib/email/templates/events";
import { normalizeLang, type Lang } from "@/src/lib/i18n/shared";
import { logAdminAction } from "@/src/lib/audit/log";
import { logCompanyChange } from "@/src/lib/changelog/logChange";
import { CompanyChangeType } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const NoteSchema = z.object({ note: z.string().max(500).optional() });

export async function POST(req: Request, ctx: Ctx) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  const form = await req.formData();
  const parsed = NoteSchema.safeParse({ note: form.get("note")?.toString() || undefined });
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid note" }, { status: 400 });

  const claim = await prisma.companyClaim.findUnique({
    where: { id },
    include: { company: { select: { name: true } }, user: { select: { email: true } } },
  });
  if (!claim) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  // Enforce single approved claim per company.
  const existingApproved = await prisma.companyClaim.findFirst({
    where: { companyId: claim.companyId, status: "APPROVED" },
    select: { id: true },
  });
  if (existingApproved) return NextResponse.json({ ok: false, error: "Already claimed" }, { status: 409 });

  await prisma.$transaction([
    prisma.companyClaim.update({
      where: { id },
      data: {
        status: "APPROVED",
        reviewedByUserId: session.user.id,
        reviewedAt: new Date(),
        reviewNote: parsed.data.note ?? null,
      },
    }),
    prisma.company.update({ where: { id: claim.companyId }, data: { isClaimed: true } }),
  ]);

  await logAdminAction({
    actorUserId: session.user.id,
    action: "claim.approve",
    entityType: "CompanyClaim",
    entityId: id,
    metadata: { companyId: claim.companyId },
  });

  await logCompanyChange({
    companyId: claim.companyId,
    changeType: CompanyChangeType.CLAIM_APPROVED,
    metadata: {
      claimId: id,
      userId: claim.userId,
    },
  });

  const cookie = req.headers.get("cookie") ?? "";
  const lang = normalizeLang(/(?:^|;\s*)romc_lang=([^;]+)/.exec(cookie)?.[1] ?? "ro") as Lang;
  if (claim.user.email) {
    const tpl = moderationResultEmail(lang, "claim", claim.company.name, "approved", parsed.data.note ?? null);
    await sendEmail({ to: claim.user.email, subject: tpl.subject, text: tpl.text });
  }

  return NextResponse.redirect(new URL("/admin/moderation", req.url));
}


