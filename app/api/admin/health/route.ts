import { NextResponse } from "next/server";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { prisma } from "@/src/lib/db";
import { kv } from "@vercel/kv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const checks: Record<string, unknown> = {};

  // DB
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.dbOk = true;
  } catch {
    checks.dbOk = false;
  }

  // KV
  try {
    const key = "health:admin:kv";
    await kv.set(key, "1", { ex: 10 });
    const v = await kv.get(key);
    checks.kvOk = v === "1";
  } catch {
    checks.kvOk = false;
  }

  // Config presence (no secrets returned)
  checks.resendConfigured = Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
  checks.stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET && process.env.STRIPE_PRICE_ID_MONTHLY);
  checks.cronConfigured = Boolean(process.env.CRON_SECRET);

  return NextResponse.json({ ok: true, checks });
}


