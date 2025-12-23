import { NextResponse } from "next/server";
import { z } from "zod";
import { kv } from "@vercel/kv";
import crypto from "crypto";
import { prisma } from "@/src/lib/db";
import { sendEmail } from "@/src/lib/email/resend";
import { getSupportEmail } from "@/src/lib/supportEmail";
import { requireCsrf } from "@/src/lib/csrf/middleware";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  companyId: z.string().uuid().optional(),
  companyCui: z.string().max(40).optional(),
  name: z.string().max(80).optional(),
  email: z.string().email().max(200),
  message: z.string().min(10).max(2000),
  hp: z.string().optional(),
});

function hashEmail(email: string) {
  return crypto.createHash("sha256").update(email).digest("hex");
}

function ipFromRequest(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
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
  const ip = ipFromRequest(req);
  const key = `correction:cooldown:${hashEmail(email)}:${ip}`;
  const ttl = await kv.ttl(key).catch(() => -2);
  if (ttl != null && ttl > 0) return NextResponse.json({ ok: false, error: "Try later" }, { status: 429 });
  await kv.set(key, "1", { ex: 60 * 60 * 12 });

  const row = await prisma.correctionRequest.create({
    data: {
      companyId: parsed.data.companyId ?? null,
      companyCui: parsed.data.companyCui ?? null,
      name: parsed.data.name?.trim() || null,
      email,
      message: parsed.data.message.trim(),
      status: "NEW",
    },
    select: { id: true },
  });

  const support = getSupportEmail();
  await sendEmail({
    to: support,
    subject: `Correction request ${parsed.data.companyCui ? `(CUI ${parsed.data.companyCui})` : ""}`,
    text: `New correction request\nEmail: ${email}\nCompanyId: ${parsed.data.companyId ?? "N/A"}\nCUI: ${parsed.data.companyCui ?? "N/A"}\nMessage: ${parsed.data.message}\nId: ${row.id}`,
  });

  return NextResponse.json({ ok: true });
}


