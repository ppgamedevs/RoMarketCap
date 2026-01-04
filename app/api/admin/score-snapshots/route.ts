/**
 * Admin endpoint to manually trigger score snapshots
 * 
 * Same logic as /api/cron/score-snapshots but accessible via admin session
 * (no CRON_SECRET required)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { prisma } from "@/src/lib/db";
import { kv } from "@vercel/kv";
import { isFlagEnabled } from "@/src/lib/flags/flags";
import { acquireLockWithRetry, releaseLock } from "@/src/lib/locks/distributed";
import * as Sentry from "@sentry/nextjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes

const BATCH_SIZE = 500;
const CURSOR_KEY = "cron:score-snapshots:cursor";

export async function GET(req: NextRequest) {
  return POST(req);
}

export async function POST(req: NextRequest) {
  try {
    await requireAdminSession();

    // Check feature flag
    const cronEnabled = await isFlagEnabled("CRON_SCORE_SNAPSHOTS", true);
    if (!cronEnabled) {
      return NextResponse.json({ 
        ok: false, 
        error: "Score snapshots cron is disabled via feature flag" 
      }, { status: 503 });
    }

    // Acquire lock
    const lockId = await acquireLockWithRetry("cron:score-snapshots", { ttl: 1800, maxRetries: 0 });
    if (!lockId) {
      return NextResponse.json({ 
        ok: false, 
        message: "Another snapshot process is already running" 
      }, { status: 202 });
    }

    try {
      return await executeSnapshot();
    } finally {
      await releaseLock("cron:score-snapshots", lockId);
    }
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ 
      ok: false, 
      error: error instanceof Error ? error.message : "Internal error" 
    }, { status: 500 });
  }
}

async function executeSnapshot() {
  const startTime = Date.now();
  
  console.log("[admin:score-snapshots] Starting score snapshot process...");

  // Get cursor from KV (for resumable processing)
  // Skip KV if rate limit is hit
  let cursor: string | null = null;
  try {
    cursor = await kv.get<string>(CURSOR_KEY);
  } catch (error: any) {
    if (error?.message?.includes("max requests limit exceeded")) {
      console.warn("[admin:score-snapshots] Upstash rate limit hit, skipping cursor read");
    } else {
      console.warn("[admin:score-snapshots] Failed to get cursor:", error);
    }
  }

  // Get today's date (normalized to midnight UTC)
  // Use the same date for all snapshots in this batch to ensure consistency
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  
  // Check if we already have snapshots for today (to avoid duplicates)
  // Skip KV if rate limit is hit
  let existingTodayCount = 0;
  try {
    existingTodayCount = await prisma.companyScoreHistory.count({
      where: {
        recordedAt: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000), // Next day
        },
      },
    });
  } catch (error) {
    console.warn("[admin:score-snapshots] Error checking existing snapshots:", error);
  }
  
  // If we already have snapshots for today and no cursor, we're done
  if (existingTodayCount > 0 && !cursor) {
    console.log(`[admin:score-snapshots] Already have ${existingTodayCount} snapshots for today, skipping`);
    try {
      await kv.del(CURSOR_KEY);
    } catch (error: any) {
      if (!error?.message?.includes("max requests limit exceeded")) {
        console.warn("[admin:score-snapshots] Failed to delete cursor:", error);
      }
    }
    return NextResponse.json({
      ok: true,
      message: `Already have ${existingTodayCount} snapshots for today`,
      snapshotted: 0,
      errors: 0,
      done: true,
    });
  }

  // Find all public companies with scores
  const companies = await prisma.company.findMany({
    where: {
      isPublic: true,
      visibilityStatus: "PUBLIC",
      romcScore: { not: null },
      isSkeleton: false,
    },
    select: {
      id: true,
      romcScore: true,
      romcConfidence: true,
      valuationRangeLow: true,
      valuationRangeHigh: true,
      revenueLatest: true,
      profitLatest: true,
      employees: true,
    },
    take: BATCH_SIZE,
    orderBy: { id: 'asc' },
    ...(cursor ? { 
      cursor: { id: cursor }, 
      skip: 1 // Skip the cursor itself
    } : {}),
  });

  console.log(`[admin:score-snapshots] Found ${companies.length} companies to snapshot`);

  if (companies.length === 0) {
    // No more companies, reset cursor
    try {
      await kv.del(CURSOR_KEY);
    } catch (error: any) {
      if (!error?.message?.includes("max requests limit exceeded")) {
        console.warn("[admin:score-snapshots] Failed to delete cursor:", error);
      }
    }
    
    console.log("[admin:score-snapshots] No companies to process, resetting cursor");
    
    return NextResponse.json({
      ok: true,
      message: "No companies to snapshot",
      snapshotted: 0,
      errors: 0,
      done: true,
    });
  }

  // Create CompanyScoreHistory records
  const snapshotData = companies.map(company => ({
    companyId: company.id,
    recordedAt: today,
    romcScore: company.romcScore || 0,
    romcConfidence: company.romcConfidence || 50,
    valuationRangeLow: company.valuationRangeLow ? Number(company.valuationRangeLow) : null,
    valuationRangeHigh: company.valuationRangeHigh ? Number(company.valuationRangeHigh) : null,
    employees: company.employees,
    revenueLatest: company.revenueLatest ? Number(company.revenueLatest) : null,
    profitLatest: company.profitLatest ? Number(company.profitLatest) : null,
    source: 'cron' as const,
  }));

  let snapshotted = 0;
  let errors = 0;

  try {
    // Use createMany with skipDuplicates to handle conflicts
    const result = await prisma.companyScoreHistory.createMany({
      data: snapshotData,
      skipDuplicates: true,
    });
    
    snapshotted = result.count;
    console.log(`[admin:score-snapshots] Created ${snapshotted} snapshots`);
  } catch (error) {
    console.error("[admin:score-snapshots] Error creating snapshots:", error);
    errors++;
  }

  // Save cursor for next batch
  const lastCompanyId = companies[companies.length - 1]?.id;
  const done = companies.length < BATCH_SIZE;

  if (lastCompanyId && !done) {
    try {
      await kv.set(CURSOR_KEY, lastCompanyId, { ex: 60 * 60 * 24 }); // 24h TTL
    } catch (error: any) {
      if (!error?.message?.includes("max requests limit exceeded")) {
        console.warn("[admin:score-snapshots] Failed to save cursor:", error);
      }
    }
  } else {
    // All done, reset cursor
    try {
      await kv.del(CURSOR_KEY);
    } catch (error: any) {
      if (!error?.message?.includes("max requests limit exceeded")) {
        console.warn("[admin:score-snapshots] Failed to delete cursor:", error);
      }
    }
  }

  // Update last run timestamp (skip if rate limit)
  try {
    await kv.set("cron:last:score-snapshots", new Date().toISOString());
  } catch (error: any) {
    if (!error?.message?.includes("max requests limit exceeded")) {
      console.warn("[admin:score-snapshots] Failed to update last run timestamp:", error);
    }
  }

  const duration = Date.now() - startTime;

  console.log(`[admin:score-snapshots] Completed in ${duration}ms: ${snapshotted} snapshots, ${errors} errors, done: ${done}`);

  return NextResponse.json({
    ok: true,
    message: `Snapshotted ${snapshotted} companies`,
    snapshotted,
    errors,
    duration,
    done,
    nextCursor: done ? null : lastCompanyId,
  });
}
