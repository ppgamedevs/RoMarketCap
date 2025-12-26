/**
 * PROMPT 55: Unified Ingestion Orchestrator v2
 * 
 * POST /api/cron/ingest-v2
 * 
 * Query params:
 * - limit: max records per source (default 200)
 * - budgetMs: max time in ms (default 25000)
 * - dry: 1 (dry run mode)
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/src/lib/db";
import { kv } from "@vercel/kv";
import { notifyCritical } from "@/src/lib/alerts/critical";
import { acquireLockWithRetry } from "@/src/lib/locks/distributed";
import { isFlagEnabled } from "@/src/lib/flags/flags";
import { shouldBlockMutation } from "@/src/lib/flags/readOnly";
import * as Sentry from "@sentry/nextjs";
import type { SourceId } from "@/src/lib/ingestion/types";
import { sourceRegistry } from "@/src/lib/ingestion/sources";
import { ingestBatch } from "@/src/lib/ingestion/ingestBatch";
import { createBudget } from "@/src/lib/ingestion/budget";
import { getCursorsSnapshot } from "@/src/lib/ingestion/cursors";
import { UnifiedIngestRunStatus } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(1000).optional().default(200),
  budgetMs: z.coerce.number().int().min(1000).max(300000).optional().default(25000),
  dry: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    // Check feature flag
    const cronEnabled = await isFlagEnabled("INGEST_ENABLED", false);
    if (!cronEnabled) {
      return NextResponse.json({ ok: false, error: "Ingestion is disabled via feature flag" }, { status: 503 });
    }

    // Check read-only mode
    const block = await shouldBlockMutation(req, false);
    if (block.blocked) {
      return NextResponse.json({ ok: false, error: block.reason }, { status: 503 });
    }

    const secret = process.env.CRON_SECRET;
    const got = req.headers.get("x-cron-secret");
    if (!secret || got !== secret) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    // Acquire lock
    const lockId = await acquireLockWithRetry("cron:ingest", { ttl: 3600, maxRetries: 0 });
    if (!lockId) {
      return NextResponse.json({ ok: false, message: "locked" }, { status: 202 });
    }

    try {
      return await executeIngest(req);
    } finally {
      await import("@/src/lib/locks/distributed").then(({ releaseLock }) => releaseLock("cron:ingest", lockId));
    }
  } catch (error) {
    Sentry.captureException(error);
    await notifyCritical({ route: "/api/cron/ingest-v2", message: error instanceof Error ? error.message : "Unknown error" });
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}

async function executeIngest(req: Request) {
  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid query" }, { status: 400 });
  }

  const { limit, budgetMs, dry } = parsed.data;
  const dryRun = dry === "1" || dry === "true";

  // Get enabled sources
  const enabledSources = await sourceRegistry.getEnabled();
  const sourcesEnabled = enabledSources.map((s) => s.sourceId);

  if (sourcesEnabled.length === 0) {
    return NextResponse.json({ ok: true, message: "No sources enabled", results: [] });
  }

  // Create ingest run
  let runId: string | undefined;
  if (!dryRun) {
    const run = await prisma.unifiedIngestRun.create({
      data: {
        status: "STARTED",
        startedAt: new Date(),
        sourcesEnabled: sourcesEnabled,
        counters: {},
        cursorSnapshot: {},
      },
    });
    runId = run.id;
  }

  // Create budget
  const budget = createBudget(limit, budgetMs);

  // Get initial cursors
  const initialCursors = await getCursorsSnapshot();

  const results: Array<{
    sourceId: SourceId;
    ok: boolean;
    stats?: unknown;
    error?: string;
  }> = [];

  const allCounters: Record<SourceId, {
    seen: number;
    upserted: number;
    created: number;
    updated: number;
    materialChanges: number;
    errors: number;
  }> = {} as any;

  // Process each source
  for (const source of enabledSources) {
    // Check per-source flag
    const flagKey = `flag:INGEST_${source.sourceId}`;
    const sourceEnabled = await kv.get<boolean>(flagKey).catch(() => true);
    if (sourceEnabled === false) {
      continue;
    }

    try {
      if (!dryRun) {
        const batchResult = await ingestBatch(source.sourceId, budget, limit);
        
        allCounters[source.sourceId] = {
          seen: batchResult.recordsSeen,
          upserted: batchResult.companiesCreated + batchResult.companiesUpdated,
          created: batchResult.companiesCreated,
          updated: batchResult.companiesUpdated,
          materialChanges: batchResult.materialChanges,
          errors: batchResult.errors,
        };

        // Store errors
        if (batchResult.errorDetails.length > 0 && runId) {
          await prisma.ingestItemError.createMany({
            data: batchResult.errorDetails.map((err) => ({
              ingestRunId: runId!,
              sourceId: source.sourceId,
              sourceRef: err.sourceRef,
              errorCode: "INGEST_ERROR",
              message: err.error,
            })),
          });
        }

        results.push({
          sourceId: source.sourceId,
          ok: true,
          stats: batchResult,
        });
      } else {
        // Dry run - just fetch and count
        const { records } = await source.fetchBatch(initialCursors[source.sourceId] || undefined, limit);
        results.push({
          sourceId: source.sourceId,
          ok: true,
          stats: {
            recordsSeen: records.length,
            recordsProcessed: 0,
            companiesCreated: 0,
            companiesUpdated: 0,
            materialChanges: 0,
            errors: 0,
          },
        });
      }
    } catch (error) {
      results.push({
        sourceId: source.sourceId,
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      Sentry.captureException(error);
    }
  }

  // Get final cursors
  const finalCursors = await getCursorsSnapshot();

  // Update run
  if (!dryRun && runId) {
    const totalSeen = Object.values(allCounters).reduce((sum, c) => sum + c.seen, 0);
    const totalErrors = Object.values(allCounters).reduce((sum, c) => sum + c.errors, 0);
    const status = totalErrors > totalSeen / 2 ? "PARTIAL" : "COMPLETED";

    await prisma.unifiedIngestRun.update({
      where: { id: runId },
      data: {
        status,
        finishedAt: new Date(),
        counters: allCounters,
        cursorSnapshot: finalCursors,
      },
    });
  }

  // Store KV stats
  if (!dryRun) {
    await kv.set("cron:last:ingest", new Date().toISOString(), { ex: 60 * 60 * 24 * 7 }).catch(() => null);
    await kv.set(
      "cron:stats:ingest",
      JSON.stringify({
        sourcesEnabled,
        counters: allCounters,
        ts: new Date().toISOString(),
      }),
      { ex: 60 * 60 * 24 * 7 },
    ).catch(() => null);
  }

  return NextResponse.json({
    ok: true,
    dry: dryRun,
    sourcesEnabled,
    results,
    counters: dryRun ? {} : allCounters,
  });
}

