import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/src/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { rateLimit } from "@/src/lib/ratelimit";
import { sendEmail } from "@/src/lib/email/resend";
import { claimSubmittedEmail } from "@/src/lib/email/templates/events";
import { claimDripEmailDay0 } from "@/src/lib/email/templates/claim-drip";
import { normalizeLang, type Lang } from "@/src/lib/i18n/shared";
import { enforceCooldown, setCooldown } from "@/src/lib/cooldown";
import { requireCsrf } from "@/src/lib/csrf/middleware";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ cui: string }> };

const BodySchema = z.object({
  role: z.enum(["founder", "employee", "other"]),
  evidenceUrl: z.string().url().optional(),
  note: z.string().max(500).optional(),
  hp: z.string().optional(),
});

export async function POST(req: Request, ctx: Ctx) {
  const session = await getServerSession(authOptions);
  const rl = await rateLimit(req, { kind: session?.user?.id ? "auth" : "anon", key: session?.user?.id ? `user:${session.user.id}` : undefined });
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Rate limit exceeded" }, { status: 429, headers: rl.headers });

  if (!session?.user?.id) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401, headers: rl.headers });

  // Check read-only mode
  const { shouldBlockMutation } = await import("@/src/lib/flags/readOnly");
  const isAdmin = session.user.role === "admin";
  const block = await shouldBlockMutation(req, isAdmin);
  if (block.blocked) {
    return NextResponse.json({ ok: false, error: block.reason }, { status: 503, headers: rl.headers });
  }

  const csrf = await requireCsrf(req);
  if (!csrf.ok) return NextResponse.json({ ok: false, error: csrf.error }, { status: csrf.status ?? 403, headers: rl.headers });

  const { cui } = await ctx.params;
  const company = await prisma.company.findUnique({ where: { cui }, select: { id: true, name: true, cui: true } });
  if (!company) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404, headers: rl.headers });

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400, headers: rl.headers });
  if ((parsed.data.hp ?? "").trim()) return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400, headers: rl.headers });

  const cd = await enforceCooldown("claim", session.user.id, company.id);
  if (!cd.ok) return NextResponse.json({ ok: false, error: "Cooldown active", retryAfterSeconds: cd.remainingSeconds }, { status: 429, headers: rl.headers });

  const claim = await prisma.companyClaim.create({
    data: {
      companyId: company.id,
      userId: session.user.id,
      role: parsed.data.role,
      evidenceUrl: parsed.data.evidenceUrl ?? null,
      note: parsed.data.note ?? null,
      status: "PENDING",
    },
  });
  await setCooldown("claim", session.user.id, company.id);

  const cookie = req.headers.get("cookie") ?? "";
  const lang = normalizeLang(/(?:^|;\s*)romc_lang=([^;]+)/.exec(cookie)?.[1] ?? "ro") as Lang;
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { email: true } });
  if (user?.email) {
    // Send day 0 drip email (enhanced confirmation)
    const companyData = await prisma.company.findUnique({
      where: { id: company.id },
      select: { slug: true },
    });
    if (companyData) {
      const tpl = claimDripEmailDay0(lang, company.name, companyData.slug);
      await sendEmail({ to: user.email, subject: tpl.subject, text: tpl.text });
    }
  }
  const admin = process.env.EMAIL_ADMIN;
  if (admin) {
    await sendEmail({
      to: admin,
      subject: `New claim: ${company.name} (${company.cui ?? "N/A"})`,
      text: `Claim submitted for ${company.name} (CUI ${company.cui ?? "N/A"}).`,
    });
  }

  return NextResponse.json({ ok: true, claimId: claim.id }, { headers: rl.headers });
}


