import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/src/lib/db";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { sendEmail } from "@/src/lib/email/resend";
import { moderationResultEmail } from "@/src/lib/email/templates/events";
import { normalizeLang, type Lang } from "@/src/lib/i18n/shared";
import { logAdminAction } from "@/src/lib/audit/log";

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

  const sub = await prisma.companySubmission.findUnique({
    where: { id },
    include: { company: { select: { name: true } }, user: { select: { email: true } } },
  });
  if (!sub) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  await prisma.companySubmission.update({
    where: { id },
    data: {
      status: "REJECTED",
      reviewedByUserId: session.user.id,
      reviewedAt: new Date(),
      reviewNote: parsed.data.note ?? null,
    },
  });

  await logAdminAction({
    actorUserId: session.user.id,
    action: "submission.reject",
    entityType: "CompanySubmission",
    entityId: id,
    metadata: { companyId: sub.companyId, type: sub.type },
  });

  const cookie = req.headers.get("cookie") ?? "";
  const lang = normalizeLang(/(?:^|;\s*)romc_lang=([^;]+)/.exec(cookie)?.[1] ?? "ro") as Lang;
  if (sub.user.email) {
    const tpl = moderationResultEmail(lang, "submission", sub.company.name, "rejected", parsed.data.note ?? null);
    await sendEmail({ to: sub.user.email, subject: tpl.subject, text: tpl.text });
  }

  return NextResponse.redirect(new URL("/admin/moderation", req.url));
}


