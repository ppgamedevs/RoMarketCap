import { NextResponse } from "next/server";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { prisma } from "@/src/lib/db";
import { rateLimit } from "@/src/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Conversion tracking sanity checks
 * Verifies that conversion events are being tracked correctly
 */
export async function GET(req: Request) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const rl = await rateLimit(req, { kind: "auth", key: `admin:${session.user.id}` });
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: "Rate limit exceeded" }, { status: 429, headers: rl.headers });
  }

  try {
    const checks: Array<{ name: string; status: "pass" | "warn" | "fail"; message: string }> = [];

    // Check 1: Premium users have Stripe subscription
    const premiumUsers = await prisma.user.findMany({
      where: { isPremium: true },
      select: { id: true, stripeSubscriptionId: true },
    });
    const premiumWithoutSubscription = premiumUsers.filter((u) => !u.stripeSubscriptionId);
    checks.push({
      name: "Premium users have Stripe subscription",
      status: premiumWithoutSubscription.length === 0 ? "pass" : "warn",
      message: `${premiumWithoutSubscription.length} premium users without Stripe subscription`,
    });

    // Check 2: Stripe subscriptions match DB premium status
    const stripeSubscriptions = await prisma.user.findMany({
      where: { stripeSubscriptionId: { not: null } },
      select: { id: true, isPremium: true, subscriptionStatus: true },
    });
    const mismatchedSubscriptions = stripeSubscriptions.filter(
      (u) => u.subscriptionStatus === "active" && !u.isPremium,
    );
    checks.push({
      name: "Stripe subscriptions match DB premium status",
      status: mismatchedSubscriptions.length === 0 ? "pass" : "fail",
      message: `${mismatchedSubscriptions.length} active subscriptions with non-premium users`,
    });

    // Check 3: Referral conversions tracked
    const referralConversions = await prisma.referralEvent.count({
      where: { kind: "PREMIUM_CONVERSION" },
    });
    const premiumUsersWithReferral = await prisma.user.count({
      where: { referredByUserId: { not: null }, isPremium: true },
    });
    checks.push({
      name: "Referral conversions tracked",
      status: referralConversions >= premiumUsersWithReferral * 0.9 ? "pass" : "warn",
      message: `${referralConversions} conversion events vs ${premiumUsersWithReferral} referred premium users`,
    });

    // Check 4: Newsletter subscribers confirmed
    const totalSubscribers = await prisma.newsletterSubscriber.count();
    const confirmedSubscribers = await prisma.newsletterSubscriber.count({
      where: { confirmedAt: { not: null } },
    });
    const confirmationRate = totalSubscribers > 0 ? confirmedSubscribers / totalSubscribers : 0;
    checks.push({
      name: "Newsletter confirmation rate",
      status: confirmationRate > 0.5 ? "pass" : confirmationRate > 0.3 ? "warn" : "fail",
      message: `${(confirmationRate * 100).toFixed(1)}% confirmation rate (${confirmedSubscribers}/${totalSubscribers})`,
    });

    // Check 5: Company claims have users
    const claimsWithoutUsers = await prisma.companyClaim.count({
      where: { userId: null as any },
    });
    checks.push({
      name: "Company claims have users",
      status: claimsWithoutUsers === 0 ? "pass" : "fail",
      message: `${claimsWithoutUsers} claims without associated users`,
    });

    const allPass = checks.every((c) => c.status === "pass");
    const hasFailures = checks.some((c) => c.status === "fail");

    return NextResponse.json({
      ok: true,
      allPass,
      hasFailures,
      checks,
    });
  } catch (error) {
    console.error("[conversion-tracking-check] Error:", error);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}

