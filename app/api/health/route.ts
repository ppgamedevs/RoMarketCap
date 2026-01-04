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
  let kvRateLimited = false;
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
  } catch (error: any) {
    if (error?.message?.includes("max requests limit exceeded")) {
      kvRateLimited = true;
      console.warn("[health] Upstash rate limit hit during KV health check");
    }
    kvOk = false;
    cacheOk = false;
  }

  // Fetch cron last run times (with error handling for rate limits)
  // Skip all KV reads if we detected rate limit during health check
  const cron: Record<string, string | null> = {};
  const cronKeys = ["recalculate", "enrich", "weekly-digest", "watchlist-alerts", "billing"];
  
  if (!kvRateLimited) {
    for (const key of cronKeys) {
      try {
        cron[key] = (await kv.get<string>(`cron:last:${key}`)) ?? null;
      } catch (error: any) {
        // If Upstash is at rate limit, stop trying and set all to null
        if (error?.message?.includes("max requests limit exceeded")) {
          kvRateLimited = true;
          // Set remaining keys to null without trying
          for (const remainingKey of cronKeys.slice(cronKeys.indexOf(key))) {
            cron[remainingKey] = null;
          }
          break;
        }
        cron[key] = null;
      }
    }
  } else {
    // Already rate limited, set all to null
    for (const key of cronKeys) {
      cron[key] = null;
    }
  }

  let billingStatsParsed = null;
  if (!kvRateLimited) {
    try {
      const billingStats = await kv.get<string>("cron:stats:billing");
      billingStatsParsed = billingStats ? JSON.parse(billingStats) : null;
    } catch (error: any) {
      // Skip if rate limit hit
      if (error?.message?.includes("max requests limit exceeded")) {
        kvRateLimited = true;
      } else {
        console.error("[health] Error fetching billing stats:", error);
      }
    }
  }

  // Check if billing is degraded (reconcile not run in 72h or recent errors)
  const billingLastRun = cron["billing"] ? new Date(cron["billing"]).getTime() : null;
  const hoursSinceBilling = billingLastRun ? (Date.now() - billingLastRun) / (1000 * 60 * 60) : null;
  const billingDegraded = hoursSinceBilling != null && hoursSinceBilling > 72;

  const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET && process.env.STRIPE_PRICE_ID_MONTHLY);
  const resendConfigured = Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);

  // Check cron health and stuck detection
  const cronHealth: Record<string, { lastRun: string | null; healthy: boolean; stuck: boolean }> = {};
  const now = Date.now();
  for (const key of cronKeys) {
    const value = cron[key];
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
  
  // Map cron keys to expected format for response
  const cronResponse = {
    recalculate: cron["recalculate"],
    enrich: cron["enrich"],
    weeklyDigest: cron["weekly-digest"],
    watchlistAlerts: cron["watchlist-alerts"],
    billing: cron["billing"],
  };

  // Check lock status for all cron routes (skip if Upstash is at limit)
  const lockStatus: Record<string, boolean> = {};
  const lockKeys = ["cron:recalculate", "cron:enrich", "cron:weekly-digest", "cron:watchlist-alerts", "cron:billing-reconcile"];
  
  if (!kvRateLimited) {
    for (const lockKey of lockKeys) {
      try {
        lockStatus[lockKey] = await isLockHeld(lockKey);
      } catch (error: any) {
        // If Upstash is at rate limit, set all locks to false (unknown status)
        if (error?.message?.includes("max requests limit exceeded")) {
          kvRateLimited = true;
          lockStatus[lockKey] = false;
          // Skip remaining locks to save requests
          for (const remainingKey of lockKeys.slice(lockKeys.indexOf(lockKey) + 1)) {
            lockStatus[remainingKey] = false;
          }
          break;
        }
        lockStatus[lockKey] = false;
      }
    }
  } else {
    // Already rate limited, set all locks to false
    for (const lockKey of lockKeys) {
      lockStatus[lockKey] = false;
    }
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
    },
    cron: cronResponse,
    cronHealth,
    billing: {
      lastReconcile: cron["billing"],
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
    nationalIngest: await getNationalIngestHealth(),
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

    // Get KV stats (skip if rate limited)
    let lastIngestTime: string | null = null;
    let ingestStats: string | null = null;
    try {
      lastIngestTime = await kv.get<string>("cron:last:ingest");
      ingestStats = await kv.get<string>("cron:stats:ingest");
    } catch (error: any) {
      // Suppress rate limit errors
      if (!error?.message?.includes("max requests limit exceeded")) {
        console.error("[health] Error fetching ingest stats:", error);
      }
    }

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

/**
 * PROMPT 61: Get national ingestion health stats
 */
async function getNationalIngestHealth() {
  try {
    const { prisma } = await import("@/src/lib/db");
    const { kv } = await import("@vercel/kv");
    const { readLastRunStats } = await import("@/src/lib/ingestion/national/checkpoint");

    // Last run time (skip if rate limited)
    let lastRunTime: string | null = null;
    try {
      lastRunTime = await kv.get<string>("national-ingest:last-run");
    } catch (error: any) {
      // Suppress rate limit errors
      if (!error?.message?.includes("max requests limit exceeded")) {
        console.error("[health] Error fetching national ingest last run:", error);
      }
    }
    
    // Last run stats (already handles rate limits internally)
    const lastRunStats = await readLastRunStats();
    
    // Last job
    const lastJob = await prisma.nationalIngestJob.findFirst({
      orderBy: { startedAt: "desc" },
      select: {
        startedAt: true,
        finishedAt: true,
        status: true,
        discovered: true,
        upserted: true,
        errors: true,
      },
    });

    // Error count in last run
    const errorCountLastRun = lastJob?.errors || 0;
    
    // Check if degraded (no run in 24h or high error rate)
    const hoursSinceLastRun = lastRunTime
      ? (Date.now() - new Date(lastRunTime).getTime()) / (1000 * 60 * 60)
      : null;
    const degraded = hoursSinceLastRun != null && hoursSinceLastRun > 24;

    return {
      nationalIngestLastRun: lastRunTime,
      nationalIngestDegraded: degraded,
      discoveredLastRun: lastJob?.discovered || 0,
      upsertedLastRun: lastJob?.upserted || 0,
      errorCountLastRun,
      lastJobStatus: lastJob?.status || null,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}


