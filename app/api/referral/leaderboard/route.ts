import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/db";
import { rateLimit } from "@/src/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Get referral leaderboard (top referrers by conversions and LTV)
 */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const rl = await rateLimit(req, { kind: "auth", key: `user:${session.user.id}` });
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: "Rate limit exceeded" }, { status: 429, headers: rl.headers });
  }

  try {
    // Get top referrers by conversions and LTV
    const topReferrers = await prisma.user.findMany({
      where: {
        referralLtv: { gt: 0 },
        referralEventsAsReferrer: {
          some: {
            kind: "PREMIUM_CONVERSION",
          },
        },
      },
      select: {
        id: true,
        referralLtv: true,
        referralEventsAsReferrer: {
          where: {
            kind: "PREMIUM_CONVERSION",
          },
          select: {
            id: true,
          },
        },
      },
      orderBy: [
        { referralLtv: "desc" },
        { createdAt: "asc" },
      ],
      take: 50,
    });

    const entries = topReferrers.map((user, idx) => ({
      userId: user.id,
      conversions: user.referralEventsAsReferrer.length,
      ltv: user.referralLtv ? Number(user.referralLtv) : 0,
      rank: idx + 1,
    }));

    return NextResponse.json({ ok: true, entries });
  } catch (error) {
    console.error("[referral-leaderboard] Error:", error);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}

