/**
 * PROMPT 54: National Company Discovery Orchestrator
 * 
 * POST /api/cron/ingest
 * 
 * Query params:
 * - source: SEAP|EU_FUNDS|ALL (default ALL)
 * - discoverLimit: max CUIs to discover (default 200)
 * - verifyLimit: max CUIs to verify (default 20)
 * - dry: 1 (dry run mode)
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/src/lib/db";
import { notifyCritical } from "@/src/lib/alerts/critical";
import { acquireLockWithRetry } from "@/src/lib/locks/distributed";
import { isFlagEnabled } from "@/src/lib/flags/flags";
import { shouldBlockMutation } from "@/src/lib/flags/readOnly";
import * as Sentry from "@sentry/nextjs";
import { DiscoverySource, DiscoveryStatus, IngestRunStatus } from "@prisma/client";
import { SEAPAdapter } from "@/src/lib/ingest/adapters/seap";
import { EUFundsAdapter } from "@/src/lib/ingest/adapters/euFunds";
import { verifyAndUpsert } from "@/src/lib/ingest/verifyAndUpsert";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  source: z.enum(["SEAP", "EU_FUNDS", "ALL"]).optional().default("ALL"),
  discoverLimit: z.coerce.number().int().min(1).max(1000).optional().default(200),
  verifyLimit: z.coerce.number().int().min(1).max(100).optional().default(20),
  dry: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    // Check feature flag
    const cronEnabled = await isFlagEnabled("INGEST_ENABLED", false);
    if (!cronEnabled) {
      return NextResponse.json({ ok: false, error: "Ingestion cron is disabled via feature flag" }, { status: 503 });
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
    const lockId = await acquireLockWithRetry("lock:cron:ingest", { ttl: 3600, maxRetries: 0 });
    if (!lockId) {
      return NextResponse.json({ ok: false, message: "locked" }, { status: 202 });
    }

    try {
      return await executeIngest(req);
    } finally {
      await import("@/src/lib/locks/distributed").then(({ releaseLock }) => releaseLock("lock:cron:ingest", lockId));
    }
  } catch (error) {
    Sentry.captureException(error);
    await notifyCritical({ route: "/api/cron/ingest", message: error instanceof Error ? error.message : "Unknown error" });
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}

async function executeIngest(req: Request) {
  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid query" }, { status: 400 });
  }

  const { source, discoverLimit, verifyLimit, dry } = parsed.data;
  const dryRun = dry === "1" || dry === "true";

  // Determine sources to process
  const sources: DiscoverySource[] =
    source === "ALL" ? ["SEAP", "EU_FUNDS"] : source === "SEAP" ? ["SEAP"] : ["EU_FUNDS"];

  const results: Array<{
    source: DiscoverySource;
    ok: boolean;
    stats?: unknown;
    error?: string;
  }> = [];

  // Process each source
  for (const sourceType of sources) {
    try {
      const result = await processSource(sourceType, discoverLimit, verifyLimit, dryRun);
      results.push({ source: sourceType, ok: true, stats: result });
    } catch (error) {
      results.push({
        source: sourceType,
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      Sentry.captureException(error);
    }
  }

  return NextResponse.json({
    ok: true,
    dry: dryRun,
    results,
  });
}

async function processSource(
  source: DiscoverySource,
  discoverLimit: number,
  verifyLimit: number,
  dryRun: boolean,
): Promise<{
  discovered: number;
  invalid: number;
  duplicates: number;
  verified: number;
  errors: number;
  cursor: string | null;
}> {
  // Get or create ingest run
  let run = await prisma.ingestRun.findFirst({
    where: {
      source,
      status: "STARTED",
    },
    orderBy: { startedAt: "desc" },
  });

  if (!run) {
    run = await prisma.ingestRun.create({
      data: {
        source,
        status: "STARTED",
        startedAt: new Date(),
        statsJson: {
          discovered: 0,
          invalid: 0,
          duplicates: 0,
          verified: 0,
          errors: 0,
        },
      },
    });
  }

  const cursor = (run.cursor as string | null) || undefined;
  const stats = {
    discovered: 0,
    invalid: 0,
    duplicates: 0,
    verified: 0,
    errors: 0,
  };

  try {
    // Get adapter
    const adapter = source === "SEAP" ? new SEAPAdapter() : new EUFundsAdapter();

    // Discover companies
    let discoveredCount = 0;
    let lastCursor: string | undefined = cursor;

    for await (const record of adapter.discover({ cursor, limit: discoverLimit })) {
      if (discoveredCount >= discoverLimit) {
        break;
      }

      if (!dryRun) {
        // Upsert DiscoveredCompany
        try {
          await prisma.discoveredCompany.upsert({
            where: {
              discovered_company_unique: {
                cui: record.cui,
                source,
              },
            },
            create: {
              cui: record.cui,
              source,
              status: "NEW",
              evidenceJson: record.evidence as Record<string, unknown>,
              discoveredAt: record.discoveredAt || new Date(),
            },
            update: {
              // Don't update if already exists (idempotent)
            },
          });
          stats.discovered++;
        } catch (error) {
          // Check if it's a duplicate
          const existing = await prisma.discoveredCompany.findUnique({
            where: {
              discovered_company_unique: {
                cui: record.cui,
                source,
              },
            },
          });

          if (existing && existing.status !== "NEW") {
            stats.duplicates++;
          } else {
            stats.errors++;
          }
        }
      }

      discoveredCount++;
      // Update cursor (use line number or hash)
      lastCursor = String(discoveredCount + (cursor ? parseInt(cursor, 10) : 0));
    }

    // Verify discovered companies (if not dry run)
    if (!dryRun) {
      const budget = { count: verifyLimit };
      const toVerify = await prisma.discoveredCompany.findMany({
        where: {
          source,
          status: "NEW",
        },
        orderBy: { discoveredAt: "asc" },
        take: verifyLimit,
      });

      for (const discovered of toVerify) {
        const result = await verifyAndUpsert(discovered.id, budget);

        if (result.status === "VERIFIED") {
          stats.verified++;
        } else if (result.status === "INVALID" || result.status === "REJECTED") {
          stats.invalid++;
        } else {
          stats.errors++;
        }

        if (budget.count <= 0) {
          break;
        }
      }
    }

    // Update run
    if (!dryRun) {
      await prisma.ingestRun.update({
        where: { id: run.id },
        data: {
          status: stats.errors > stats.discovered / 2 ? "PARTIAL" : "COMPLETED",
          finishedAt: new Date(),
          cursor: lastCursor || null,
          statsJson: stats,
        },
      });
    }

    return {
      ...stats,
      cursor: lastCursor || null,
    };
  } catch (error) {
    // Update run with error
    if (!dryRun) {
      await prisma.ingestRun.update({
        where: { id: run.id },
        data: {
          status: "FAILED",
          finishedAt: new Date(),
          lastError: error instanceof Error ? error.message : "Unknown error",
        },
      });
    }

    throw error;
  }
}

