import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/src/lib/db";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { updateCompanyRomcV1ById } from "@/src/lib/company/updateScore";
import { sendEmail } from "@/src/lib/email/resend";
import { moderationResultEmail } from "@/src/lib/email/templates/events";
import { normalizeLang, type Lang } from "@/src/lib/i18n/shared";
import { logAdminAction } from "@/src/lib/audit/log";
import { logCompanyChange } from "@/src/lib/changelog/logChange";
import { CompanyChangeType } from "@prisma/client";
import { updateCanonicalSlug } from "@/src/lib/slug/canonical";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const NoteSchema = z.object({ note: z.string().max(500).optional() });

function allowlistedCompanyUpdates(payload: Record<string, unknown>) {
  const updates: Record<string, unknown> = {};
  if (typeof payload.website === "string") updates.website = payload.website;
  if (typeof payload.employees === "number") updates.employees = payload.employees;
  if (typeof payload.revenueLatest === "number") updates.revenueLatest = payload.revenueLatest;
  if (typeof payload.profitLatest === "number") updates.profitLatest = payload.profitLatest;
  if (payload.currency === "RON" || payload.currency === "EUR") updates.currency = payload.currency;
  if (typeof payload.city === "string") updates.city = payload.city;
  if (typeof payload.county === "string") updates.county = payload.county;
  if (typeof payload.description === "string") updates.descriptionRo = payload.description;
  return updates;
}

export async function POST(req: Request, ctx: Ctx) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  const form = await req.formData();
  const parsedNote = NoteSchema.safeParse({ note: form.get("note")?.toString() || undefined });
  if (!parsedNote.success) return NextResponse.json({ ok: false, error: "Invalid note" }, { status: 400 });

  const sub = await prisma.companySubmission.findUnique({
    where: { id },
    include: { company: { select: { name: true } }, user: { select: { email: true } } },
  });
  if (!sub) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const payload = sub.payload as Record<string, unknown>;
  const updates = allowlistedCompanyUpdates(payload);

  await prisma.$transaction(async (tx) => {
    await tx.companySubmission.update({
      where: { id },
      data: {
        status: "APPROVED",
        reviewedByUserId: session.user.id,
        reviewedAt: new Date(),
        reviewNote: parsedNote.data.note ?? null,
      },
    });
    if (Object.keys(updates).length) {
      await tx.company.update({ where: { id: sub.companyId }, data: updates });
    }
  });

  // Update canonical slug if name or domain changed
  const company = await prisma.company.findUnique({
    where: { id: sub.companyId },
    select: { name: true, cui: true },
  });
  if (company && (updates.website || payload.name)) {
    const newName = (payload.name as string | undefined) ?? company.name;
    await updateCanonicalSlug(sub.companyId, newName, company.cui, false).catch((err) => {
      console.error("[submission-approve] Failed to update canonical slug:", err);
    });
  }

  await updateCompanyRomcV1ById(sub.companyId);

  await logAdminAction({
    actorUserId: session.user.id,
    action: "submission.approve",
    entityType: "CompanySubmission",
    entityId: id,
    metadata: { companyId: sub.companyId, type: sub.type, appliedKeys: Object.keys(updates) },
  });

  await logCompanyChange({
    companyId: sub.companyId,
    changeType: CompanyChangeType.SUBMISSION_APPROVED,
    metadata: {
      submissionId: id,
      userId: sub.userId,
      type: sub.type,
      appliedKeys: Object.keys(updates),
    },
  });

  const cookie = req.headers.get("cookie") ?? "";
  const lang = normalizeLang(/(?:^|;\s*)romc_lang=([^;]+)/.exec(cookie)?.[1] ?? "ro") as Lang;
  if (sub.user.email) {
    const tpl = moderationResultEmail(lang, "submission", sub.company.name, "approved", parsedNote.data.note ?? null);
    await sendEmail({ to: sub.user.email, subject: tpl.subject, text: tpl.text });
  }

  return NextResponse.redirect(new URL("/admin/moderation", req.url));
}


