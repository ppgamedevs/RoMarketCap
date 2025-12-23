import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/db";
import { rateLimit } from "@/src/lib/ratelimit";
import { z } from "zod";
import { requireCsrf } from "@/src/lib/csrf/middleware";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UpdateSchema = z.object({
  watchlistAlerts: z.boolean().optional(),
  weeklyDigest: z.boolean().optional(),
  partnerOffers: z.boolean().optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const settings = await prisma.userNotificationSettings.findUnique({
    where: { userId: session.user.id },
  });

  if (!settings) {
    // Return defaults
    return NextResponse.json({
      ok: true,
      watchlistAlerts: true,
      weeklyDigest: true,
      partnerOffers: false,
    });
  }

  return NextResponse.json({
    ok: true,
    watchlistAlerts: settings.watchlistAlerts,
    weeklyDigest: settings.weeklyDigest,
    partnerOffers: settings.partnerOffers,
  });
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const csrf = await requireCsrf(req);
  if (!csrf.ok) return NextResponse.json({ ok: false, error: csrf.error }, { status: csrf.status });

  const rl = await rateLimit(req, { kind: "auth" });
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: "Rate limit exceeded" }, { status: 429, headers: rl.headers });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  const settings = await prisma.userNotificationSettings.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      watchlistAlerts: parsed.data.watchlistAlerts ?? true,
      weeklyDigest: parsed.data.weeklyDigest ?? true,
      partnerOffers: parsed.data.partnerOffers ?? false,
    },
    update: {
      watchlistAlerts: parsed.data.watchlistAlerts,
      weeklyDigest: parsed.data.weeklyDigest,
      partnerOffers: parsed.data.partnerOffers,
    },
  });

  return NextResponse.json({
    ok: true,
    watchlistAlerts: settings.watchlistAlerts,
    weeklyDigest: settings.weeklyDigest,
    partnerOffers: settings.partnerOffers,
  });
}

