import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/src/lib/db";
import { kv } from "@vercel/kv";
import { sendEmail } from "@/src/lib/email/resend";
import { signNewsletterConfirmToken } from "@/src/lib/newsletter/token";
import { getSiteUrl } from "@/lib/seo/site";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  email: z.string().email().max(200),
  consent: z.boolean(),
  hp: z.string().optional(),
  lang: z.enum(["ro", "en"]).optional(),
});

function ipFromRequest(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

function hashEmail(email: string) {
  return crypto.createHash("sha256").update(email).digest("hex");
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  if (!parsed.data.consent) return NextResponse.json({ ok: false, error: "Consent required" }, { status: 400 });
  if ((parsed.data.hp ?? "").trim()) return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });

  const ip = ipFromRequest(req);
  const email = parsed.data.email.trim().toLowerCase();
  const lang = parsed.data.lang ?? "ro";

  // Basic bot/WAF-style controls:
  // - short IP cooldown
  // - long email cooldown (24h)
  const ipKey = `newsletter:cooldown:ip:${ip}`;
  const ipTtl = await kv.ttl(ipKey).catch(() => -2);
  if (ipTtl != null && ipTtl > 0) return NextResponse.json({ ok: false, error: "Try later" }, { status: 429 });
  await kv.set(ipKey, "1", { ex: 60 });

  const emailKey = `newsletter:cooldown:email:${hashEmail(email)}`;
  const eTtl = await kv.ttl(emailKey).catch(() => -2);
  if (eTtl != null && eTtl > 0) return NextResponse.json({ ok: false, error: "Try later" }, { status: 429 });
  await kv.set(emailKey, "1", { ex: 60 * 60 * 24 });

  const subscriber = await prisma.newsletterSubscriber.upsert({
    where: { email },
    create: { email, lang, source: "newsletter", status: "ACTIVE" },
    update: { lang, status: "ACTIVE" },
    select: { id: true, email: true, confirmedAt: true },
  });

  const token = signNewsletterConfirmToken(subscriber.id);
  const confirmUrl = `${getSiteUrl()}/newsletter/confirm?token=${encodeURIComponent(token)}`;

  if (process.env.RESEND_API_KEY && process.env.EMAIL_FROM) {
    const subject = lang === "ro" ? "Confirmă abonarea la newsletter" : "Confirm your newsletter subscription";
    const text =
      lang === "ro"
        ? `Confirmă abonarea: ${confirmUrl}\n\nDacă nu ai cerut asta, poți ignora emailul.\n\nRoMarketCap`
        : `Confirm subscription: ${confirmUrl}\n\nIf you did not request this, you can ignore this email.\n\nRoMarketCap`;
    await sendEmail({ to: subscriber.email, subject, text });
  }

  return NextResponse.json({ ok: true });
}


