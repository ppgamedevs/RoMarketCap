import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { prisma } from "@/src/lib/db";
import { hashApiKey, last4 } from "@/src/lib/apiKeys/hash";
import { logAdminAction } from "@/src/lib/audit/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  label: z.string().min(1).max(80),
  plan: z.enum(["FREE", "PARTNER", "PREMIUM"]),
  rateLimitKind: z.enum(["anon", "auth", "premium"]).optional(),
  active: z.boolean().optional(),
});

function generateKey() {
  return `romc_${crypto.randomBytes(24).toString("hex")}`;
}

export async function POST(req: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return NextResponse.json({ ok: false, error: "NEXTAUTH_SECRET not configured" }, { status: 500 });

  const raw = generateKey();
  const keyHash = hashApiKey(raw, secret);

  const created = await prisma.apiKey.create({
    data: {
      label: parsed.data.label.trim(),
      plan: parsed.data.plan,
      rateLimitKind: parsed.data.rateLimitKind ?? "premium",
      active: parsed.data.active ?? true,
      keyHash,
      last4: last4(raw),
    },
    select: { id: true },
  });

  await logAdminAction({
    actorUserId: session.user.id,
    action: "apikey.create",
    entityType: "ApiKey",
    entityId: created.id,
    metadata: { label: parsed.data.label, plan: parsed.data.plan, tier: parsed.data.rateLimitKind ?? "premium" },
  });

  return NextResponse.json({ ok: true, key: raw });
}


