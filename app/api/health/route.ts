import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { kv } from "@vercel/kv";
import { isReadOnlyMode } from "@/src/lib/flags/readOnly";
import { isLockHeld } from "@/src/lib/locks/distributed";
import { isLaunchMode, getEffectiveDemoMode } from "@/src/lib/launch/mode";

export const runtime = "nodejs";

// Expected cron intervals (in hours)
const CRON_INTERVALS: Record<string, number> = {
  recalculate: 24, // Daily
  enrich: 6, // Every 6 hours
  "weekly-digest": 168, // Weekly
  "watchlist-alerts": 1, // Hourly
  billing: 24, // Daily
};

export async function GET() {
  let dbOk = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    dbOk = false;
  }

  let kvOk = false;
  let cacheOk = false;
  try {
    const key = "health:kv";
    await kv.set(key, "1", { ex: 10 });
    const v = await kv.get(key);
    kvOk = v === "1";

    // Test cache read/write
    const cacheKey = "health:cache";
    await kv.set(cacheKey, { test: true }, { ex: 10 });
    const cacheVal = await kv.get(cacheKey);
    cacheOk = cacheVal != null;
    await kv.del(cacheKey).catch(() => null);
  } catch {
    kvOk = false;
    cacheOk = false;
  }

  const cron = {
    recalculate: (await kv.get<string>("cron:last:recalculate").catch(() => null)) ?? null,
    enrich: (await kv.get<string>("cron:last:enrich").catch(() => null)) ?? null,
    weeklyDigest: (await kv.get<string>("cron:last:weekly-digest").catch(() => null)) ?? null,
    watchlistAlerts: (await kv.get<string>("cron:last:watchlist-alerts").catch(() => null)) ?? null,
    billing: (await kv.get<string>("cron:last:billing").catch(() => null)) ?? null,
  };

  const billingStats = await kv.get<string>("cron:stats:billing").catch(() => null);
  const billingStatsParsed = billingStats ? JSON.parse(billingStats) : null;

  // Check if billing is degraded (reconcile not run in 72h or recent errors)
  const billingLastRun = cron.billing ? new Date(cron.billing).getTime() : null;
  const hoursSinceBilling = billingLastRun ? (Date.now() - billingLastRun) / (1000 * 60 * 60) : null;
  const billingDegraded = hoursSinceBilling != null && hoursSinceBilling > 72;

  const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET && process.env.STRIPE_PRICE_ID_MONTHLY);
  const resendConfigured = Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
  const plausibleConfigured = Boolean(process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN);

  // Check cron health and stuck detection
  const cronHealth: Record<string, { lastRun: string | null; healthy: boolean; stuck: boolean }> = {};
  const now = Date.now();
  for (const [key, value] of Object.entries(cron)) {
    if (value) {
      const lastRun = new Date(value).getTime();
      const hoursSince = (now - lastRun) / (1000 * 60 * 60);
      const expectedInterval = CRON_INTERVALS[key] ?? 24;
      const stuck = hoursSince > expectedInterval * 2; // Stuck if > 2x expected interval
      cronHealth[key] = { lastRun: value, healthy: hoursSince < expectedInterval * 1.5, stuck };
    } else {
      cronHealth[key] = { lastRun: null, healthy: false, stuck: false };
    }
  }

  // Check lock status for all cron routes
  const lockStatus: Record<string, boolean> = {};
  const lockKeys = ["cron:recalculate", "cron:enrich", "cron:weekly-digest", "cron:watchlist-alerts", "cron:billing-reconcile"];
  for (const lockKey of lockKeys) {
    lockStatus[lockKey] = await isLockHeld(lockKey);
  }

  const res = NextResponse.json({
    ok: true,
    service: "romarketcap",
    ts: new Date().toISOString(),
    build: {
      vercelEnv: process.env.VERCEL_ENV ?? null,
      commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    },
    dbOk,
    kvOk,
    cacheOk,
    locks: lockStatus,
    configured: {
      nextauthSecret: Boolean(process.env.NEXTAUTH_SECRET),
      adminEmails: Boolean(process.env.ADMIN_EMAILS),
      siteUrl: Boolean(process.env.NEXT_PUBLIC_SITE_URL),
      cronSecret: Boolean(process.env.CRON_SECRET),
      stripe: stripeConfigured,
      resend: resendConfigured,
      plausible: plausibleConfigured,
    },
    cron,
    cronHealth,
    billing: {
      lastReconcile: cron.billing,
      stats: billingStatsParsed,
      degraded: billingDegraded,
    },
    fallback: {
      aiEnabled: true, // AI scoring is enabled
      enrichmentEnabled: true, // Enrichment is enabled
      deterministicOnly: false, // Not in deterministic-only mode
    },
    readOnlyMode: await isReadOnlyMode(),
    demoMode: getEffectiveDemoMode(),
    launchMode: isLaunchMode(),
    ingestion: await getIngestionHealth(),
  });
  res.headers.set("Cache-Control", "no-store");
  return res;
}

/**
 * PROMPT 55: Get ingestion health stats
 */
async function getIngestionHealth() {
  try {
    const { prisma } = await import("@/src/lib/db");
    const { kv } = await import("@vercel/kv");

    // Last ingest run
    const lastRun = await prisma.unifiedIngestRun.findFirst({
      orderBy: { startedAt: "desc" },
      select: { startedAt: true, status: true },
    });

    // Companies with source seen in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const companiesWithSourceSeen = await prisma.company.count({
      where: {
        lastSeenAtFromSources: {
          gte: thirtyDaysAgo,
        },
      },
    });

    // Manual-only companies (no source seen)
    const manualOnly = await prisma.company.count({
      where: {
        lastSeenAtFromSources: null,
      },
    });

    // Top error codes in last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentErrors = await prisma.ingestItemError.groupBy({
      by: ["errorCode"],
      where: {
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
      _count: true,
      orderBy: {
        _count: {
          errorCode: "desc",
        },
      },
      take: 5,
    });

    // Get KV stats
    const lastIngestTime = await kv.get<string>("cron:last:ingest").catch(() => null);
    const ingestStats = await kv.get<string>("cron:stats:ingest").catch(() => null);

    return {
      lastRun: lastRun
        ? {
            startedAt: lastRun.startedAt.toISOString(),
            status: lastRun.status,
          }
        : null,
      lastIngestTime,
      companiesWithSourceSeen,
      manualOnly,
      topErrors: recentErrors.map((e) => ({
        code: e.errorCode,
        count: e._count,
      })),
      stats: ingestStats ? JSON.parse(ingestStats) : null,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}


