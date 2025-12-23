import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/db";
import { rateLimit } from "@/src/lib/ratelimit";
import { kv } from "@vercel/kv";
import { requireCsrf } from "@/src/lib/csrf/middleware";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
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

  const userId = session.user.id;

  // Cooldown: max 1 deletion per 24h per user
  const cooldownKey = `account:delete:cooldown:${userId}`;
  const cooldown = await kv.get<string>(cooldownKey).catch(() => null);
  if (cooldown === "1") {
    return NextResponse.json({ ok: false, error: "Account deletion cooldown active. Please try again later." }, { status: 429 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, isPremium: true, stripeCustomerId: true },
  });

  if (!user) {
    return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
  }

  // Warn if premium but don't block
  if (user.isPremium && user.stripeCustomerId) {
    // Log warning but proceed
    console.warn(`[account-delete] Premium user ${userId} deleting account. Subscription should be cancelled via Stripe portal.`);
  }

  // Delete user data (cascade will handle relations)
  await prisma.$transaction(async (tx) => {
    // Delete watchlist items
    await tx.watchlistItem.deleteMany({ where: { userId } });

    // Delete alert rules
    await tx.userAlertRule.deleteMany({ where: { userId } });

    // Delete saved comparisons
    await tx.savedComparison.deleteMany({ where: { userId } });

    // Delete watchlist settings
    await tx.watchlistSettings.deleteMany({ where: { userId } });

    // Delete notification settings
    await tx.userNotificationSettings.deleteMany({ where: { userId } });

    // Delete referral code
    await tx.referralCode.deleteMany({ where: { userId } });

    // Delete referral credits
    await tx.referralCredit.deleteMany({ where: { userId } });

    // Delete referral events (as referrer)
    await tx.referralEvent.deleteMany({ where: { referrerUserId: userId } });

    // Anonymize partner leads (keep for audit but anonymize data)
    const anonymizedEmail = `deleted-${userId.slice(0, 8)}@deleted.local`;
    await tx.partnerLead.updateMany({
      where: { email: user.email ?? undefined },
      data: { name: "[Deleted]", email: anonymizedEmail },
    });

    // Anonymize correction requests
    await tx.correctionRequest.updateMany({
      where: { email: user.email ?? undefined },
      data: { name: "[Deleted]", email: anonymizedEmail },
    });

    // API keys are not directly linked to users in current schema
    // If they were, we'd delete them here

    // Delete NextAuth sessions and accounts
    await tx.session.deleteMany({ where: { userId } });
    await tx.account.deleteMany({ where: { userId } });

    // Anonymize admin audit logs (null actor email but keep record)
    await tx.adminAuditLog.updateMany({
      where: { actorUserId: userId },
      data: { metadata: { actorEmailAnonymized: true } },
    });

    // Finally delete user
    await tx.user.delete({ where: { id: userId } });
  });

  // Set cooldown
  await kv.set(cooldownKey, "1", { ex: 60 * 60 * 24 }).catch(() => null);

  return NextResponse.json({ ok: true, message: "Account deleted successfully" }, { headers: rl.headers });
}

