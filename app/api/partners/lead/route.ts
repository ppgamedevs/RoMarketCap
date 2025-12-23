import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/src/lib/db";
import { kv } from "@vercel/kv";
import crypto from "crypto";
import { sendEmail } from "@/src/lib/email/resend";
import { requireCsrf } from "@/src/lib/csrf/middleware";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email().max(200),
  company: z.string().min(1).max(120),
  useCase: z.enum(["api", "exports", "reports", "media", "sponsorship"]),
  message: z.string().min(1).max(2000),
  hp: z.string().optional(),
});

function hashEmail(email: string) {
  return crypto.createHash("sha256").update(email).digest("hex");
}

function adminRecipient(): string | null {
  if (process.env.EMAIL_ADMIN) return process.env.EMAIL_ADMIN;
  const raw = process.env.ADMIN_EMAILS ?? "";
  const first = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)[0];
  return first ?? null;
}

export async function POST(req: Request) {
  // Check read-only mode
  const { shouldBlockMutation } = await import("@/src/lib/flags/readOnly");
  const block = await shouldBlockMutation(req, false);
  if (block.blocked) {
    return NextResponse.json({ ok: false, error: block.reason }, { status: 503 });
  }

  const csrf = await requireCsrf(req);
  if (!csrf.ok) return NextResponse.json({ ok: false, error: csrf.error }, { status: csrf.status ?? 403 });

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  if ((parsed.data.hp ?? "").trim()) return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });

  const email = parsed.data.email.trim().toLowerCase();
  const key = `partners:lead:cooldown:${hashEmail(email)}`;
  const ttl = await kv.ttl(key).catch(() => -2);
  if (ttl != null && ttl > 0) return NextResponse.json({ ok: false, error: "Try later" }, { status: 429 });
  await kv.set(key, "1", { ex: 60 * 60 * 24 });

  const lead = await prisma.partnerLead.create({
    data: {
      name: parsed.data.name.trim(),
      email,
      company: parsed.data.company.trim(),
      useCase: parsed.data.useCase,
      message: parsed.data.message.trim(),
      status: "NEW",
    },
    select: { id: true },
  });

  const admin = adminRecipient();
  if (admin) {
    await sendEmail({
      to: admin,
      subject: `Partner lead: ${parsed.data.useCase} (${parsed.data.company})`,
      text: `New lead\nName: ${parsed.data.name}\nEmail: ${email}\nCompany: ${parsed.data.company}\nUse case: ${parsed.data.useCase}\nMessage: ${parsed.data.message}\nLeadId: ${lead.id}`,
    });
  }
  await sendEmail({
    to: email,
    subject: "RoMarketCap - we received your message",
    text: "Thanks. We received your message and will reply soon.\n\nRoMarketCap",
  });

  return NextResponse.json({ ok: true });
}


