/**
 * PROMPT 56: National Ingestion Orchestrator v1
 * 
 * Unified orchestrator that runs all ingestion sources safely
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/src/lib/db";
import { kv } from "@vercel/kv";
import { notifyCritical } from "@/src/lib/alerts/critical";
import { acquireLockWithRetry, releaseLock } from "@/src/lib/locks/distributed";
import { isFlagEnabled } from "@/src/lib/flags/flags";
import { shouldBlockMutation } from "@/src/lib/flags/readOnly";
import * as Sentry from "@sentry/nextjs";
import { sourceRegistry } from "@/src/lib/ingestion/sources";
import { ingestBatch } from "@/src/lib/ingestion/ingestBatch";
import { createBudget } from "@/src/lib/ingestion/budget";
import type { SourceId } from "@/src/lib/ingestion/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  budgetCompanies: z.coerce.number().int().min(1).max(2000).optional().default(500),
  dry: z.string().optional(),
  sources: z.string().optional(), // Comma-separated: seap,eu,anaf,provider
});

// Time budget: 45 seconds max
const MAX_TIME_BUDGET_MS = 45000;

export async function POST(req: Request) {
  try {
    // Check feature flag
    const cronEnabled = await isFlagEnabled("FLAG_INGEST_NATIONAL", false);
    if (!cronEnabled) {
      return NextResponse.json({ ok: false, error: "National ingestion is disabled via feature flag" }, { status: 503 });
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
    const lockId = await acquireLockWithRetry("cron:ingest-national", { ttl: 3600, maxRetries: 0 });
    if (!lockId) {
      return NextResponse.json({ ok: false, message: "locked" }, { status: 202 });
    }

    try {
      return await executeIngest(req);
    } finally {
      await releaseLock("cron:ingest-national", lockId);
    }
  } catch (error) {
    Sentry.captureException(error);
    await notifyCritical({
      route: "/api/cron/ingest-national-v2",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}

async function executeIngest(req: Request) {
  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid query" }, { status: 400 });
  }

  const { budgetCompanies, dry, sources } = parsed.data;
  const dryRun = dry === "1" || dry === "true";

  // Parse sources filter
  const sourceFilter = sources
    ? sources.split(",").map((s) => s.trim().toUpperCase().replace("-", "_"))
    : undefined;

  // Get enabled sources
  const allSources = await sourceRegistry.getEnabled();
  const enabledSources = sourceFilter
    ? allSources.filter((s) => sourceFilter.includes(s.sourceId))
    : allSources;

  if (enabledSources.length === 0) {
    return NextResponse.json({ ok: true, message: "No sources enabled", results: [] });
  }

  const startTime = Date.now();
  const budget = createBudget(budgetCompanies, MAX_TIME_BUDGET_MS);

  const results: Array<{
    sourceId: SourceId;
    ok: boolean;
    stats?: unknown;
    error?: string;
  }> = [];

  const allCounters: Record<
    SourceId,
    {
      seen: number;
      upserted: number;
      created: number;
      updated: number;
      materialChanges: number;
      errors: number;
    }
  > = {} as any;

  const errors: Array<{ sourceId: SourceId; sourceRef: string; error: string }> = [];

  // Process each source
  for (const source of enabledSources) {
    // Check per-source flag
    const flagKey = `flag:INGEST_${source.sourceId}`;
    const sourceEnabled = await kv.get<boolean>(flagKey).catch(() => true);
    if (sourceEnabled === false) {
      continue;
    }

    // Check time budget
    if (Date.now() - startTime >= MAX_TIME_BUDGET_MS) {
      results.push({
        sourceId: source.sourceId,
        ok: false,
        error: "Time budget exceeded",
      });
      break;
    }

    try {
      if (!dryRun) {
        const batchResult = await ingestBatch(source.sourceId, budget, Math.floor(budgetCompanies / enabledSources.length));

        allCounters[source.sourceId] = {
          seen: batchResult.recordsSeen,
          upserted: batchResult.companiesCreated + batchResult.companiesUpdated,
          created: batchResult.companiesCreated,
          updated: batchResult.companiesUpdated,
          materialChanges: batchResult.materialChanges,
          errors: batchResult.errors,
        };

        // Collect errors for dead-letter
        for (const err of batchResult.errorDetails) {
          errors.push({
            sourceId: source.sourceId,
            sourceRef: err.sourceRef,
            error: err.error,
          });
        }

        results.push({
          sourceId: source.sourceId,
          ok: true,
          stats: batchResult,
        });
      } else {
        // Dry run - just fetch and count
        const cursor = await kv.get<string>(`ingest:cursor:${source.sourceId}`).catch(() => null);
        const { records } = await source.fetchBatch(cursor || undefined, Math.floor(budgetCompanies / enabledSources.length));
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
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      results.push({
        sourceId: source.sourceId,
        ok: false,
        error: errorMessage,
      });
      Sentry.captureException(error);

      // Record in dead-letter (if mechanism exists)
      try {
        // TODO: Integrate with dead-letter mechanism from Prompt 23
        // For now, just log to errors array
        errors.push({
          sourceId: source.sourceId,
          sourceRef: "source-error",
          error: errorMessage,
        });
      } catch (dlError) {
        console.error("Failed to record dead-letter:", dlError);
      }
    }
  }

  const duration = Date.now() - startTime;
  const totalProcessed = Object.values(allCounters).reduce((sum, c) => sum + c.seen, 0);
  const totalCreated = Object.values(allCounters).reduce((sum, c) => sum + c.created, 0);
  const totalUpdated = Object.values(allCounters).reduce((sum, c) => sum + c.updated, 0);
  const totalErrors = Object.values(allCounters).reduce((sum, c) => sum + c.errors, 0);

  // Store KV stats
  if (!dryRun) {
    const stats = {
      processed: totalProcessed,
      created: totalCreated,
      updated: totalUpdated,
      errors: totalErrors,
      duration,
      perSource: allCounters,
      timestamp: new Date().toISOString(),
    };

    await kv.set("cron:last:ingest-national", new Date().toISOString(), { ex: 60 * 60 * 24 * 7 }).catch(() => null);
    await kv.set("cron:stats:ingest-national", JSON.stringify(stats), { ex: 60 * 60 * 24 * 7 }).catch(() => null);

    // Store cursors
    for (const source of enabledSources) {
      const cursor = await kv.get<string>(`ingest:cursor:${source.sourceId}`).catch(() => null);
      if (cursor) {
        await kv.set(`cron:cursor:ingest-national:${source.sourceId}`, cursor, { ex: 60 * 60 * 24 * 7 }).catch(() => null);
      }
    }
  }

  return NextResponse.json({
    ok: true,
    dry: dryRun,
    sources: enabledSources.map((s) => s.sourceId),
    results,
    summary: {
      processed: totalProcessed,
      created: totalCreated,
      updated: totalUpdated,
      errors: totalErrors,
      duration,
    },
    counters: dryRun ? {} : allCounters,
  });
}

