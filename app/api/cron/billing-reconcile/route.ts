import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/src/lib/db";
import { kv } from "@vercel/kv";
import { notifyCritical } from "@/src/lib/alerts/critical";
import { logAdminAction } from "@/src/lib/audit/log";
import Stripe from "stripe";
import { acquireLockWithRetry } from "@/src/lib/locks/distributed";
import { isFlagEnabled } from "@/src/lib/flags/flags";
import * as Sentry from "@sentry/nextjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional().default(100),
  dry: z.string().optional(),
});

function requireCronSecret(req: Request): { ok: boolean; error?: string; status?: number } {
  const secret = process.env.CRON_SECRET;
  const got = req.headers.get("x-cron-secret");
  if (!secret || got !== secret) return { ok: false, error: "Forbidden", status: 403 };
  return { ok: true };
}

export async function GET(req: Request) {
  try {
    // Check feature flag
    const cronEnabled = await isFlagEnabled("CRON_BILLING_RECONCILE", true);
    if (!cronEnabled) {
      return NextResponse.json({ ok: false, error: "Billing reconcile cron is disabled via feature flag" }, { status: 503 });
    }

    const guard = requireCronSecret(req);
    if (!guard.ok) return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });

    const lockId = await acquireLockWithRetry("cron:billing-reconcile", { ttl: 1800, maxRetries: 0 });
    if (!lockId) {
      return NextResponse.json({ ok: false, message: "locked" }, { status: 202 });
    }

    try {
      return await executeBillingReconcile(req);
    } finally {
      await import("@/src/lib/locks/distributed").then(({ releaseLock }) => releaseLock("cron:billing-reconcile", lockId));
    }
  } catch (error) {
    Sentry.captureException(error);
    await notifyCritical({ route: "/api/cron/billing-reconcile", message: error instanceof Error ? error.message : "Unknown error" });
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}

async function executeBillingReconcile(req: Request) {
  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid query" }, { status: 400 });

    const dry = parsed.data.dry === "1" || parsed.data.dry === "true";
    const limit = parsed.data.limit;
    const now = new Date();
    const startedAt = Date.now();

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const priceId = process.env.STRIPE_PRICE_ID_MONTHLY;
    if (!stripeKey || !priceId) {
      return NextResponse.json({ ok: false, error: "Stripe not configured" }, { status: 500 });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });

    const cursorKey = "cron:cursor:billing";
    const cursor = (await kv.get<string>(cursorKey).catch(() => null)) ?? null;

    const users = await prisma.user.findMany({
      where: { stripeCustomerId: { not: null } },
      orderBy: { id: "asc" },
      take: limit,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        email: true,
        stripeCustomerId: true,
        isPremium: true,
        premiumSince: true,
        premiumUntil: true,
        subscriptionStatus: true,
      },
    });

    if (users.length === 0) {
      await kv.del(cursorKey).catch(() => null);
      return NextResponse.json(
        { ok: true, processed: 0, flipped: 0, errors: 0, dry, cursor: null, durationMs: Date.now() - startedAt },
      );
    }

    let processed = 0;
    let flipped = 0;
    let errors = 0;

    for (const user of users) {
      processed += 1;
      if (!user.stripeCustomerId) continue;

      try {
        // Check Stripe subscription status
        const subscriptions = await stripe.subscriptions.list({
          customer: user.stripeCustomerId,
          status: "active",
          price: priceId,
          limit: 1,
        });

        const hasActiveSubscription = subscriptions.data.length > 0;
        const subscription = subscriptions.data[0];

        if (!dry) {
          if (hasActiveSubscription && !user.isPremium) {
            // Should be premium but isn't
            await prisma.user.update({
              where: { id: user.id },
              data: {
                isPremium: true,
                subscriptionStatus: subscription.status,
                premiumSince: user.premiumSince ?? now,
                premiumUntil: subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null,
              },
            });

            await logAdminAction({
              actorUserId: user.id, // System action
              action: "BILLING_RECONCILE_FLIP",
              entityType: "User",
              entityId: user.id,
              metadata: { from: false, to: true, reason: "stripe_active_but_db_false" },
            });

            flipped += 1;
          } else if (!hasActiveSubscription && user.isPremium) {
            // Check for referral credits that might extend premium
            const pendingCredits = await prisma.referralCredit.findFirst({
              where: { userId: user.id, status: "PENDING" },
              select: { days: true },
            });

            // Only flip if no pending credits (or if credits are expired)
            if (!pendingCredits || pendingCredits.days <= 0) {
              await prisma.user.update({
                where: { id: user.id },
                data: {
                  isPremium: false,
                  subscriptionStatus: null,
                  premiumUntil: null,
                },
              });

              await logAdminAction({
                actorUserId: user.id,
                action: "BILLING_RECONCILE_FLIP",
                entityType: "User",
                entityId: user.id,
                metadata: { from: true, to: false, reason: "stripe_inactive_but_db_true" },
              });

              flipped += 1;
            }
          }
        }
      } catch (e) {
        errors += 1;
        console.error("[billing-reconcile] user_failed", { userId: user.id, error: e instanceof Error ? e.message : "Unknown" });
      }
    }

    const nextCursor = users.length ? users[users.length - 1]!.id : null;
    if (!dry) {
      if (users.length < limit) {
        await kv.del(cursorKey).catch(() => null);
      } else if (nextCursor) {
        await kv.set(cursorKey, nextCursor, { ex: 60 * 60 * 24 * 14 }).catch(() => null);
      }
      await kv.set("cron:last:billing", new Date().toISOString(), { ex: 60 * 60 * 24 * 14 }).catch(() => null);
      await kv.set(
        "cron:stats:billing",
        JSON.stringify({ processed, flipped, errors, ts: new Date().toISOString() }),
        { ex: 60 * 60 * 24 * 14 },
      ).catch(() => null);
    }

  return NextResponse.json({
    ok: true,
    processed,
    flipped,
    errors,
    dry,
    cursor: nextCursor,
    durationMs: Date.now() - startedAt,
  });
}

