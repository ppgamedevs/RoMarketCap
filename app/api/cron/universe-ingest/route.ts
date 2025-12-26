/**
 * PROMPT 57: Universe Ingestion Cron
 * 
 * Creates skeleton companies from public sources (SEAP, EU Funds, ANAF)
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
import { upsertSkeletonCompany } from "@/src/lib/universe/skeleton";
import { SEAPAdapter } from "@/src/lib/ingest/adapters/seap";
import { EUFundsAdapter } from "@/src/lib/ingest/adapters/euFunds";
import { normalizeCui } from "@/src/lib/cui/normalize";
import type { UniverseSource } from "@/src/lib/universe/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  source: z.enum(["SEAP", "EU_FUNDS", "ANAF"]).optional(),
  limit: z.coerce.number().int().min(1).max(5000).optional().default(1000),
  dry: z.string().optional(),
});

// Time budget: 60 seconds max
const MAX_TIME_BUDGET_MS = 60000;

export async function POST(req: Request) {
  try {
    // Check feature flag
    const cronEnabled = await isFlagEnabled("FLAG_UNIVERSE_INGEST", false);
    if (!cronEnabled) {
      return NextResponse.json({ ok: false, error: "Universe ingestion is disabled via feature flag" }, { status: 503 });
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
    const lockId = await acquireLockWithRetry("cron:universe-ingest", { ttl: 3600, maxRetries: 0 });
    if (!lockId) {
      return NextResponse.json({ ok: false, message: "locked" }, { status: 202 });
    }

    try {
      return await executeIngest(req);
    } finally {
      await releaseLock("cron:universe-ingest", lockId);
    }
  } catch (error) {
    Sentry.captureException(error);
    await notifyCritical({
      route: "/api/cron/universe-ingest",
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

  const { source, limit, dry } = parsed.data;
  const dryRun = dry === "1" || dry === "true";

  const startTime = Date.now();
  const sources: UniverseSource[] = source ? [source] : ["SEAP", "EU_FUNDS"];

  const results: Record<string, { created: number; updated: number; errors: number }> = {};

  for (const src of sources) {
    if (Date.now() - startTime >= MAX_TIME_BUDGET_MS) {
      break;
    }

    const cursorKey = `universe:cursor:${src}`;
    const cursor = await kv.get<string>(cursorKey).catch(() => null);

    try {
      let created = 0;
      let updated = 0;
      let errors = 0;
      let processed = 0;

      if (src === "SEAP") {
        const adapter = new SEAPAdapter();
        for await (const record of adapter.discover({ cursor: cursor || undefined, limit })) {
          if (Date.now() - startTime >= MAX_TIME_BUDGET_MS) {
            break;
          }

          processed++;
          if (processed % 100 === 0) {
            await kv.set(cursorKey, String(processed), { ex: 60 * 60 * 24 * 7 });
          }

          if (!dryRun) {
            try {
              const cui = normalizeCui(record.cui);
              if (!cui) {
                errors++;
                continue;
              }

              const result = await upsertSkeletonCompany({
                cui,
                legalName: record.companyName || "Unknown",
                countySlug: undefined, // Can be extracted from evidence if available
                caenCode: undefined,
                foundedAt: record.evidence.date ? new Date(record.evidence.date) : undefined,
                universeSource: "SEAP",
                universeConfidence: 60,
                universeVerified: false,
              });

              if (result.created) {
                created++;
              } else {
                updated++;
              }
            } catch (err) {
              errors++;
              console.error(`Error processing SEAP record:`, err);
            }
          } else {
            created++; // Count in dry run
          }
        }
      } else if (src === "EU_FUNDS") {
        const adapter = new EUFundsAdapter();
        for await (const record of adapter.discover({ cursor: cursor || undefined, limit })) {
          if (Date.now() - startTime >= MAX_TIME_BUDGET_MS) {
            break;
          }

          processed++;
          if (processed % 100 === 0) {
            await kv.set(cursorKey, String(processed), { ex: 60 * 60 * 24 * 7 });
          }

          if (!dryRun) {
            try {
              const cui = normalizeCui(record.cui);
              if (!cui) {
                errors++;
                continue;
              }

              const result = await upsertSkeletonCompany({
                cui,
                legalName: record.companyName || "Unknown",
                countySlug: undefined,
                caenCode: undefined,
                foundedAt: record.evidence.date ? new Date(record.evidence.date) : undefined,
                universeSource: "EU_FUNDS",
                universeConfidence: 70,
                universeVerified: false,
              });

              if (result.created) {
                created++;
              } else {
                updated++;
              }
            } catch (err) {
              errors++;
              console.error(`Error processing EU Funds record:`, err);
            }
          } else {
            created++;
          }
        }
      }

      results[src] = { created, updated, errors };

      if (!dryRun && processed > 0) {
        await kv.set(cursorKey, String(processed), { ex: 60 * 60 * 24 * 7 });
      }
    } catch (error) {
      results[src] = { created: 0, updated: 0, errors: 1 };
      Sentry.captureException(error);
    }
  }

  const duration = Date.now() - startTime;
  const totalCreated = Object.values(results).reduce((sum, r) => sum + r.created, 0);
  const totalUpdated = Object.values(results).reduce((sum, r) => sum + r.updated, 0);
  const totalErrors = Object.values(results).reduce((sum, r) => sum + r.errors, 0);

  if (!dryRun) {
    await kv.set("cron:last:universe-ingest", new Date().toISOString(), { ex: 60 * 60 * 24 * 7 });
    await kv.set("cron:stats:universe-ingest", JSON.stringify({
      created: totalCreated,
      updated: totalUpdated,
      errors: totalErrors,
      duration,
      timestamp: new Date().toISOString(),
    }), { ex: 60 * 60 * 24 * 7 });
  }

  return NextResponse.json({
    ok: true,
    dry: dryRun,
    sources,
    results,
    summary: {
      created: totalCreated,
      updated: totalUpdated,
      errors: totalErrors,
      duration,
    },
  });
}

