/**
 * PROMPT 58: Financial Sync Cron Route
 * 
 * POST /api/cron/financial-sync
 * Query: limit=, dry=1
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { isFlagEnabled } from "@/src/lib/flags/flags";
import { shouldBlockMutation } from "@/src/lib/flags/readOnly";
import { acquireLockWithRetry, releaseLock } from "@/src/lib/locks/distributed";
import { syncCompanyFinancialsByCui } from "@/src/lib/connectors/anaf/syncFinancials";
import { prisma } from "@/src/lib/db";
import { Prisma, CompanyFinancialDataSource } from "@prisma/client";
import { kv } from "@vercel/kv";
import { notifyCritical } from "@/src/lib/alerts/critical";
import * as Sentry from "@sentry/nextjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
  dry: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    // Check feature flag
    const cronEnabled = await isFlagEnabled("FINANCIAL_SYNC_CRON_ENABLED", false);
    if (!cronEnabled) {
      return NextResponse.json(
        { ok: false, error: "Financial sync cron is disabled via feature flag" },
        { status: 503 }
      );
    }

    const globalEnabled = await isFlagEnabled("FINANCIAL_SYNC_ENABLED", false);
    if (!globalEnabled) {
      return NextResponse.json(
        { ok: false, error: "Financial sync feature is disabled via feature flag" },
        { status: 503 }
      );
    }

    // Check read-only mode
    const block = await shouldBlockMutation(req, false);
    if (block.blocked) {
      return NextResponse.json({ ok: false, error: block.reason }, { status: 503 });
    }

    // Check CRON_SECRET
    const secret = process.env.CRON_SECRET;
    const got = req.headers.get("x-cron-secret");
    if (!secret || got !== secret) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    // Acquire lock
    const lockId = await acquireLockWithRetry("cron:financial-sync", { ttl: 3600, maxRetries: 0 });
    if (!lockId) {
      return NextResponse.json({ ok: false, message: "locked" }, { status: 202 });
    }

    try {
      return await executeSync(req);
    } finally {
      await releaseLock("cron:financial-sync", lockId);
    }
  } catch (error) {
    Sentry.captureException(error);
    await notifyCritical({
      route: "/api/cron/financial-sync",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}

async function executeSync(req: Request) {
  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid query" }, { status: 400 });
  }

  const { limit, dry } = parsed.data;
  const dryRun = dry === "1" || dry === "true";

  // Create sync job
  let jobId: string | null = null;
  if (!dryRun) {
    const job = await prisma.financialSyncJob.create({
      data: {
        mode: dryRun ? "DRY_RUN" : "LIVE",
        limit,
        status: "STARTED",
      },
    });
    jobId = job.id;
  }

  // Get companies that need syncing (missing or stale)
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 90); // Default: 90 days

  const where: Prisma.CompanyWhereInput = {
    isPublic: true,
    cui: { not: null },
    OR: [
      { lastFinancialSyncAt: null },
      { lastFinancialSyncAt: { lt: cutoffDate } },
    ],
  };

  // Get cursor from KV
  const cursorKey = "cron:financial-sync:cursor";
  const cursor = await kv.get<string>(cursorKey);

  // Fetch companies
  const companies = await prisma.company.findMany({
    where,
    select: {
      id: true,
      cui: true,
      name: true,
      lastFinancialSyncAt: true,
    },
    orderBy: { cui: "asc" },
    take: limit,
    ...(cursor ? { skip: 1, cursor: { cui: cursor } } : {}),
  });

  if (companies.length === 0) {
    return NextResponse.json({
      ok: true,
      message: "No companies to sync",
      stats: { processed: 0, ok: 0, failed: 0 },
    });
  }

  // Process companies
  const stats = {
    processed: 0,
    ok: 0,
    failed: 0,
    errors: [] as Array<{ cui: string; error: string }>,
  };

  let lastCursor: string | null = null;

  for (const company of companies) {
    if (!company.cui) continue;

    try {
      const result = await syncCompanyFinancialsByCui({
        cui: company.cui,
        dryRun,
        preferLatest: true,
      });

      stats.processed++;
      if (result.success) {
        stats.ok++;
      } else {
        stats.failed++;
        stats.errors.push({ cui: company.cui, error: result.error || "Unknown error" });
      }

      lastCursor = company.cui;
    } catch (error) {
      stats.processed++;
      stats.failed++;
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      stats.errors.push({ cui: company.cui || "unknown", error: errorMsg });
      Sentry.captureException(error);
    }
  }

  // Update cursor
  if (lastCursor && !dryRun) {
    await kv.set(cursorKey, lastCursor);
  }

  // Update job
  if (jobId && !dryRun) {
    await prisma.financialSyncJob.update({
      where: { id: jobId },
      data: {
        finishedAt: new Date(),
        status: stats.failed === 0 ? "COMPLETED" : "FAILED",
        okCount: stats.ok,
        failCount: stats.failed,
        lastError: stats.errors.length > 0 ? stats.errors[0].error : null,
        stats: stats as Prisma.InputJsonValue,
      },
    });

    // Store KV stats
    await kv.set("cron:last:financial-sync", new Date().toISOString());
    await kv.set("cron:stats:financial-sync", JSON.stringify(stats));
  }

  return NextResponse.json({
    ok: true,
    dryRun,
    stats,
    cursor: lastCursor,
  });
}

