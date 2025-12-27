/**
 * PROMPT 60: Auto-generate Merge Candidates Cron
 * 
 * POST /api/cron/merge-candidates
 * Query: limit=, dry=1
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { isFlagEnabled } from "@/src/lib/flags/flags";
import { shouldBlockMutation } from "@/src/lib/flags/readOnly";
import { acquireLockWithRetry, releaseLock } from "@/src/lib/locks/distributed";
import { findMergeCandidates } from "@/src/lib/merge/identityResolution";
import { prisma } from "@/src/lib/db";
import { Prisma } from "@prisma/client";
import { kv } from "@vercel/kv";
import * as Sentry from "@sentry/nextjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  dry: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    // Check feature flag
    const cronEnabled = await isFlagEnabled("MERGE_CANDIDATES_CRON_ENABLED", false);
    if (!cronEnabled) {
      return NextResponse.json(
        { ok: false, error: "Merge candidates cron is disabled via feature flag" },
        { status: 503 }
      );
    }

    const globalEnabled = await isFlagEnabled("MERGE_CANDIDATES_ENABLED", false);
    if (!globalEnabled) {
      return NextResponse.json(
        { ok: false, error: "Merge candidates feature is disabled via feature flag" },
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
    const lockId = await acquireLockWithRetry("cron:merge-candidates", { ttl: 3600, maxRetries: 0 });
    if (!lockId) {
      return NextResponse.json({ ok: false, message: "locked" }, { status: 202 });
    }

    try {
      return await executeMergeCandidates(req);
    } finally {
      await releaseLock("cron:merge-candidates", lockId);
    }
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}

async function executeMergeCandidates(req: Request) {
  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid query" }, { status: 400 });
  }

  const { limit, dry } = parsed.data;
  const dryRun = dry === "1" || dry === "true";

  // Get cursor from KV
  const cursorKey = "cron:merge-candidates:cursor";
  const cursor = await kv.get<string>(cursorKey);

  // Get companies to process (recently ingested, not merged, not demo)
  const where: Prisma.CompanyWhereInput = {
    isPublic: true,
    visibilityStatus: "PUBLIC",
    isDemo: false,
    mergedIntoCompanyId: null,
    // Only process companies that haven't been checked recently
    // or companies that were recently updated
    lastUpdatedAt: cursor
      ? { gte: new Date(cursor) }
      : { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Last 7 days
  };

  const companies = await prisma.company.findMany({
    where,
    select: {
      id: true,
      cui: true,
      name: true,
      lastUpdatedAt: true,
    },
    orderBy: { lastUpdatedAt: "asc" },
    take: limit,
  });

  if (companies.length === 0) {
    return NextResponse.json({
      ok: true,
      message: "No companies to process",
      stats: { processed: 0, candidatesCreated: 0 },
    });
  }

  const stats = {
    processed: 0,
    candidatesCreated: 0,
    errors: [] as Array<{ companyId: string; error: string }>,
  };

  let lastCursor: string | null = null;

  for (const company of companies) {
    try {
      // Find merge candidates for this company
      const candidates = await findMergeCandidates(company.id, {
        minConfidence: 50,
        excludeExisting: true,
      });

      if (!dryRun && candidates.length > 0) {
        // Create merge candidate records
        for (const candidate of candidates) {
          try {
            await prisma.mergeCandidate.create({
              data: {
                sourceCompanyId: candidate.sourceCompanyId,
                targetCompanyId: candidate.targetCompanyId,
                confidence: candidate.confidence,
                matchReasons: candidate.matchReasons as Prisma.InputJsonValue,
                diffJson: candidate.diffJson as Prisma.InputJsonValue,
                status: "PENDING",
              },
            });
            stats.candidatesCreated++;
          } catch (error) {
            // Ignore duplicate candidate errors
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
              continue;
            }
            throw error;
          }
        }
      }

      stats.processed++;
      lastCursor = company.lastUpdatedAt.toISOString();
    } catch (error) {
      stats.processed++;
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      stats.errors.push({ companyId: company.id, error: errorMsg });
      Sentry.captureException(error, {
        tags: { module: "merge_candidates", companyId: company.id },
      });
    }
  }

  // Update cursor
  if (lastCursor && !dryRun) {
    await kv.set(cursorKey, lastCursor);
    await kv.set("cron:last:merge-candidates", new Date().toISOString());
    await kv.set("cron:stats:merge-candidates", JSON.stringify(stats));
  }

  return NextResponse.json({
    ok: true,
    dryRun,
    stats,
    cursor: lastCursor,
  });
}

