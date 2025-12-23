import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/db";
import { rateLimit } from "@/src/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Apply pending referral credits (premium days and export credits)
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const rl = await rateLimit(req, { kind: "auth", key: `user:${session.user.id}` });
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: "Rate limit exceeded" }, { status: 429, headers: rl.headers });
  }

  try {
    // Find pending credits for this user
    const pendingCredits = await prisma.referralCredit.findMany({
      where: {
        userId: session.user.id,
        status: "PENDING",
      },
    });

    if (pendingCredits.length === 0) {
      return NextResponse.json({ ok: true, applied: false, message: "No pending credits" });
    }

    const totalDays = pendingCredits.reduce((sum, c) => sum + c.days, 0);
    const totalExportCredits = pendingCredits.reduce((sum, c) => sum + c.exportCredits, 0);

    // Apply premium days
    if (totalDays > 0) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { premiumUntil: true, isPremium: true, premiumSince: true },
      });

      const now = new Date();
      const currentPremiumUntil = user?.premiumUntil && user.premiumUntil > now ? user.premiumUntil : now;
      const newPremiumUntil = new Date(currentPremiumUntil.getTime() + totalDays * 24 * 60 * 60 * 1000);

      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          premiumUntil: newPremiumUntil,
          isPremium: true,
          premiumSince: user?.premiumSince ?? now,
        },
      });
    }

    // Apply export credits
    if (totalExportCredits > 0) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          exportCredits: { increment: totalExportCredits },
        },
      });
    }

    // Mark credits as applied
    await prisma.referralCredit.updateMany({
      where: {
        id: { in: pendingCredits.map((c) => c.id) },
      },
      data: {
        status: "APPLIED",
        appliedAt: new Date(),
      },
    });

    return NextResponse.json({
      ok: true,
      applied: true,
      days: totalDays,
      exportCredits: totalExportCredits,
    });
  } catch (error) {
    console.error("[apply-credits] Error:", error);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}

