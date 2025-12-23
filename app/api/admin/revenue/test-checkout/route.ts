import { NextResponse } from "next/server";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { rateLimitAdmin } from "@/src/lib/ratelimit/admin";
import { prisma } from "@/src/lib/db";
import { getStripe } from "@/src/lib/stripe";
import { getSiteUrl } from "@/lib/seo/site";
import { logAdminAction } from "@/src/lib/audit/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Create a test checkout session for the current admin user.
 * POST /api/admin/revenue/test-checkout
 */
export async function POST(req: Request) {
  try {
    // Rate limit admin routes
    const rl = await rateLimitAdmin(req);
    if (!rl.ok) {
      return NextResponse.json({ ok: false, error: rl.error }, { status: rl.status, headers: rl.headers });
    }

    const session = await requireAdminSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401, headers: rl.headers });
    }

    const priceId = process.env.STRIPE_PRICE_ID_MONTHLY;
    if (!priceId) {
      return NextResponse.json({ ok: false, error: "STRIPE_PRICE_ID_MONTHLY not configured" }, { status: 500, headers: rl.headers });
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) {
      return NextResponse.json({ ok: false, error: "User not found" }, { status: 404, headers: rl.headers });
    }

    const stripe = getStripe();
    const baseUrl = getSiteUrl();

    // Ensure Stripe customer exists
    let customerId = user.stripeCustomerId ?? null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        name: user.name ?? undefined,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
    }

    // Create checkout session with test metadata
    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/billing?checkout=success&test=true`,
      cancel_url: `${baseUrl}/billing`,
      allow_promotion_codes: true,
      metadata: {
        userId: user.id,
        purpose: "revenue_check",
        test: "true",
      },
    });

    // Log admin action
    await logAdminAction({
      actorUserId: session.user.id,
      action: "REVENUE_TEST_CHECKOUT",
      entityType: "CHECKOUT_SESSION",
      entityId: checkout.id,
      metadata: { purpose: "revenue_check", url: checkout.url },
    });

    return NextResponse.json({ ok: true, url: checkout.url, sessionId: checkout.id }, { headers: rl.headers });
  } catch (error) {
    console.error("[revenue-check] Error:", error);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}

