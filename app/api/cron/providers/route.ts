/**
 * PROMPT 53: Provider Ingestion Cron Route
 * 
 * POST /api/cron/providers
 * 
 * Query params:
 * - provider: provider_id (optional, else run all enabled)
 * - limit: max items per provider (default 200)
 * - dry: 1 (no DB writes, still reports stats)
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
import { ingestionProviderRegistry } from "@/src/lib/providers/ingestion/registry";
import { ingestProviderPage } from "@/src/lib/providers/ingestion/ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  provider: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(1000).optional().default(200),
  dry: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    // Check feature flag
    const cronEnabled = await isFlagEnabled("FLAG_PROVIDERS_INGEST", false);
    if (!cronEnabled) {
      return NextResponse.json({ ok: false, error: "Provider ingestion cron is disabled via feature flag" }, { status: 503 });
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

    return await executeIngest(req);
  } catch (error) {
    Sentry.captureException(error);
    await notifyCritical({ route: "/api/cron/providers", message: error instanceof Error ? error.message : "Unknown error" });
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}

async function executeIngest(req: Request) {
  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid query" }, { status: 400 });
  }

  const dryRun = parsed.data.dry === "1" || parsed.data.dry === "true";
  const limit = parsed.data.limit || 200;
  const providerId = parsed.data.provider;

  // Get providers to run
  const providers: Array<{ id: string; provider: ReturnType<typeof ingestionProviderRegistry.get> }> = [];

  if (providerId) {
    // Single provider
    const provider = ingestionProviderRegistry.get(providerId);
    if (!provider) {
      return NextResponse.json({ ok: false, error: `Provider ${providerId} not found` }, { status: 404 });
    }
    providers.push({ id: providerId, provider });
  } else {
    // All enabled providers
    const all = ingestionProviderRegistry.getAll();
    for (const provider of all) {
      // Check per-provider flag
      const flagKey = `flag:PROVIDER_${provider.id.toUpperCase().replace(/-/g, "_")}`;
      const enabled = await kv.get<boolean>(flagKey).catch(() => true); // Default enabled
      if (enabled) {
        providers.push({ id: provider.id, provider });
      }
    }
  }

  if (providers.length === 0) {
    return NextResponse.json({ ok: true, message: "No providers to run", results: [] });
  }

  const results: Array<{
    providerId: string;
    ok: boolean;
    stats?: unknown;
    error?: string;
  }> = [];

  // Process each provider
  for (const { id, provider } of providers) {
    if (!provider) {
      results.push({ providerId: id, ok: false, error: "Provider not found" });
      continue;
    }

    // Acquire lock per provider
    const lockKey = `lock:provider:${id}`;
    const lockId = await acquireLockWithRetry(lockKey, { ttl: 3600, maxRetries: 0 });
    if (!lockId) {
      results.push({ providerId: id, ok: false, error: "Locked (already running)" });
      continue;
    }

    try {
      const result = await processProvider(id, provider, limit, dryRun);
      results.push({ providerId: id, ok: true, stats: result });
    } catch (error) {
      results.push({
        providerId: id,
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      Sentry.captureException(error);
    } finally {
      await import("@/src/lib/locks/distributed").then(({ releaseLock }) => releaseLock(lockKey, lockId));
    }
  }

  return NextResponse.json({
    ok: true,
    dry: dryRun,
    results,
  });
}

async function processProvider(
  providerId: string,
  provider: NonNullable<ReturnType<typeof ingestionProviderRegistry.get>>,
  limit: number,
  dryRun: boolean,
): Promise<{
  cursorOut: string | undefined;
  stats: {
    itemsFetched: number;
    itemsUpserted: number;
    itemsRejected: number;
    errors: Array<{ error: string }>;
  };
  runtimeMs: number;
}> {
  const startTime = Date.now();

  // Get cursor from KV
  const cursorKey = `provider:cursor:${providerId}`;
  const cursor = (await kv.get<string>(cursorKey).catch(() => null)) || undefined;

  // Create run record
  let runId: string | undefined;
  if (!dryRun) {
    const run = await prisma.providerRun.create({
      data: {
        providerId,
        status: "RUNNING",
        cursorIn: cursor || null,
        startedAt: new Date(),
      },
    });
    runId = run.id;
  }

  try {
    // Ingest page
    const result = await ingestProviderPage(provider, cursor, limit, {
      dryRun,
      runId,
      providerId,
    });

    const runtimeMs = Date.now() - startTime;

    // Update cursor
    if (!dryRun && result.cursorOut) {
      await kv.set(cursorKey, result.cursorOut, { ex: 60 * 60 * 24 * 7 }).catch(() => null);
    } else if (!dryRun && !result.cursorOut) {
      // Clear cursor if no more pages
      await kv.del(cursorKey).catch(() => null);
    }

    // Update run record
    if (!dryRun && runId) {
      const status = result.stats.itemsRejected > result.stats.itemsFetched / 2 ? "PARTIAL" : "SUCCESS";
      const errorSummary =
        result.stats.errors.length > 0
          ? result.stats.errors.slice(0, 10).map((e) => e.error).join("; ")
          : null;

      await prisma.providerRun.update({
        where: { id: runId },
        data: {
          status,
          finishedAt: new Date(),
          cursorOut: result.cursorOut || null,
          itemsFetched: result.stats.itemsFetched,
          itemsUpserted: result.stats.itemsUpserted,
          itemsRejected: result.stats.itemsRejected,
          errorSummary,
          runtimeMs,
        },
      });
    }

    // Store stats in KV
    if (!dryRun) {
      await kv.set(
        `provider:last:${providerId}`,
        new Date().toISOString(),
        { ex: 60 * 60 * 24 * 7 },
      ).catch(() => null);
      await kv.set(
        `provider:stats:${providerId}`,
        JSON.stringify({
          itemsFetched: result.stats.itemsFetched,
          itemsUpserted: result.stats.itemsUpserted,
          itemsRejected: result.stats.itemsRejected,
          cursor: result.cursorOut,
          ts: new Date().toISOString(),
        }),
        { ex: 60 * 60 * 24 * 7 },
      ).catch(() => null);
    }

    return {
      cursorOut: result.cursorOut,
      stats: {
        itemsFetched: result.stats.itemsFetched,
        itemsUpserted: result.stats.itemsUpserted,
        itemsRejected: result.stats.itemsRejected,
        errors: result.stats.errors.slice(0, 10).map((e) => ({ error: e.error })),
      },
      runtimeMs,
    };
  } catch (error) {
    const runtimeMs = Date.now() - startTime;

    // Update run record with error
    if (!dryRun && runId) {
      await prisma.providerRun.update({
        where: { id: runId },
        data: {
          status: "FAIL",
          finishedAt: new Date(),
          errorSummary: error instanceof Error ? error.message : "Unknown error",
          runtimeMs,
        },
      }).catch(() => null);
    }

    throw error;
  }
}

