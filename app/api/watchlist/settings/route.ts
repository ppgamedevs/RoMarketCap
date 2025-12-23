import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/db";
import { requireCsrf } from "@/src/lib/csrf/middleware";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  weeklyDigestOnly: z.boolean().optional(),
  scoreChangeAlerts: z.boolean().optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { isPremium: true } });
  const settings = await prisma.watchlistSettings.findUnique({ where: { userId: session.user.id } });
  return NextResponse.json({ ok: true, isPremium: Boolean(user?.isPremium), settings });
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const csrf = await requireCsrf(req);
  if (!csrf.ok) return NextResponse.json({ ok: false, error: csrf.error }, { status: csrf.status });

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { isPremium: true } });
  if (parsed.data.scoreChangeAlerts === true && !user?.isPremium) {
    return NextResponse.json({ ok: false, error: "Payment required", upgradeUrl: "/billing" }, { status: 402 });
  }

  const settings = await prisma.watchlistSettings.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      weeklyDigestOnly: parsed.data.weeklyDigestOnly ?? true,
      scoreChangeAlerts: parsed.data.scoreChangeAlerts ?? false,
    },
    update: {
      weeklyDigestOnly: parsed.data.weeklyDigestOnly ?? undefined,
      scoreChangeAlerts: parsed.data.scoreChangeAlerts ?? undefined,
    },
  });

  return NextResponse.json({ ok: true, settings });
}


