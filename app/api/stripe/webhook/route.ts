import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { getStripe } from "@/src/lib/stripe";
import type Stripe from "stripe";
import { sendEmail } from "@/src/lib/email/resend";
import { premiumUpgradedEmail } from "@/src/lib/email/templates/events";
import { notifyCritical } from "@/src/lib/alerts/critical";
import { logAdminAction } from "@/src/lib/audit/log";
import { kv } from "@vercel/kv";
import crypto from "crypto";

function sha256(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function syncSubscription(customerId: string, subscriptionId: string | null) {
  const stripe = getStripe();
  const now = new Date();
  if (!subscriptionId) {
    await prisma.user.updateMany({
      where: { stripeCustomerId: customerId },
      data: {
        stripeSubscriptionId: null,
        subscriptionStatus: null,
        currentPeriodEnd: null,
        premiumUntil: null,
        isPremium: false,
      },
    });
    return;
  }

  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  const status = sub.status;
  const periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null;
  const isActive = status === "active" || status === "trialing";

  const users = await prisma.user.findMany({
    where: { stripeCustomerId: customerId },
    select: { id: true, premiumSince: true },
  });

  for (const user of users) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        stripeSubscriptionId: subscriptionId,
        subscriptionStatus: status,
        currentPeriodEnd: periodEnd,
        premiumUntil: periodEnd,
        premiumSince: user.premiumSince ?? (isActive ? now : null),
        isPremium: isActive,
      },
    });
  }
}

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ ok: false, error: "STRIPE_WEBHOOK_SECRET not configured" }, { status: 500 });

  const stripe = getStripe();
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ ok: false, error: "Missing signature" }, { status: 400 });

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Invalid signature" }, { status: 400 });
  }

  // Idempotency: check if event already processed
  const eventId = event.id;
  const idempotencyKey = `stripe:webhook:${eventId}`;
  const alreadyProcessed = (await kv.get<string>(idempotencyKey).catch(() => null)) === "1";
  if (alreadyProcessed) {
    return NextResponse.json({ ok: true, message: "Already processed", eventId });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = (session.customer as string | null) ?? null;
        const subscriptionId = (session.subscription as string | null) ?? null;
        const referralCode = (session.metadata?.referralCode as string | undefined) ?? null;
        const userId = (session.metadata?.userId as string | undefined) ?? null;
          if (customerId) {
          await syncSubscription(customerId, subscriptionId);
          const user = await prisma.user.findFirst({ where: { stripeCustomerId: customerId }, select: { id: true, email: true, isPremium: true } });
          if (user?.email) {
            const tpl = premiumUpgradedEmail("ro");
            await sendEmail({ to: user.email, subject: tpl.subject, text: tpl.text });
          }

          await logAdminAction({
            actorUserId: user?.id ?? "system",
            action: "BILLING_WEBHOOK",
            entityType: "User",
            entityId: user?.id ?? customerId,
            metadata: { eventType: event.type, customerId, subscriptionId },
          });

          // Referral conversion: idempotent by Stripe checkout session id.
          if (referralCode && user?.isPremium) {
            const owner = await prisma.referralCode.findUnique({ where: { code: referralCode.toLowerCase() }, select: { userId: true } });
            const referrerId = owner?.userId ?? null;
            if (referrerId && user.id !== referrerId) {
              await prisma.referralEvent
                .create({
                  data: {
                    kind: "PREMIUM_CONVERSION",
                    externalId: session.id,
                    referralCode: referralCode.toLowerCase(),
                    referrerUserId: referrerId,
                    referredUserId: userId ?? user.id,
                    referredEmailHash: user.email ? sha256(user.email.toLowerCase()) : null,
                    rewardStatus: "PENDING",
                    metadata: { stripeCustomerId: customerId },
                  },
                })
                .catch(() => null);
              // Enhanced referral rewards: premium days + export credits
              await prisma.referralCredit
                .create({
                  data: { userId: referrerId, days: 14, exportCredits: 10, status: "PENDING" },
                })
                .catch(() => null);
              
              // Track referral LTV for referrer
              const priceId = session.metadata?.priceId as string | undefined;
              if (priceId) {
                const price = await stripe.prices.retrieve(priceId).catch(() => null);
                const amount = price ? (price.unit_amount ?? 0) / 100 : 0; // Convert to currency units
                await prisma.user.update({
                  where: { id: referrerId },
                  data: {
                    referralLtv: { increment: amount },
                  },
                }).catch(() => null);
              }
            }
          }
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const subscriptionId = sub.id;
        await syncSubscription(customerId, event.type === "customer.subscription.deleted" ? null : subscriptionId);
        await logAdminAction({
          actorUserId: "system",
          action: "BILLING_WEBHOOK",
          entityType: "User",
          entityId: customerId,
          metadata: { eventType: event.type, customerId, subscriptionId },
        });
        break;
      }
      case "invoice.paid":
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = (invoice.customer as string | null) ?? null;
        const subscriptionId = (invoice.subscription as string | null) ?? null;
        if (customerId) {
          await syncSubscription(customerId, subscriptionId);
          await logAdminAction({
            actorUserId: "system",
            action: "BILLING_WEBHOOK",
            entityType: "User",
            entityId: customerId,
            metadata: { eventType: event.type, customerId, subscriptionId },
          });
        }
        break;
      }
      default:
        break;
    }

    // Mark event as processed (idempotency)
    await kv.set(idempotencyKey, "1", { ex: 60 * 60 * 24 * 30 }).catch(() => null);

    return NextResponse.json({ ok: true, eventId });
  } catch (err) {
    await notifyCritical({
      route: "/api/stripe/webhook",
      message: err instanceof Error ? err.message : "Webhook handler error",
    });
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Webhook handler error" }, { status: 500 });
  }
}


