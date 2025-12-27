/**
 * PROMPT 61: National Ingestion Cron Route
 * 
 * POST /api/cron/national-ingest
 * Query: limit=, dry=1
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { isFlagEnabled } from "@/src/lib/flags/flags";
import { shouldBlockMutation } from "@/src/lib/flags/readOnly";
import { acquireLockWithRetry, releaseLock } from "@/src/lib/locks/distributed";
import { executeNationalIngestRun } from "@/src/lib/ingestion/national/run";
import * as Sentry from "@sentry/nextjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(1000).optional().default(500),
  dry: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    // Check feature flag
    const cronEnabled = await isFlagEnabled("NATIONAL_INGESTION_CRON_ENABLED", false);
    if (!cronEnabled) {
      return NextResponse.json(
        { ok: false, error: "National ingestion cron is disabled via feature flag" },
        { status: 503 }
      );
    }

    const globalEnabled = await isFlagEnabled("NATIONAL_INGESTION_ENABLED", false);
    if (!globalEnabled) {
      return NextResponse.json(
        { ok: false, error: "National ingestion feature is disabled via feature flag" },
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
    const lockId = await acquireLockWithRetry("cron:national-ingest", { ttl: 3600, maxRetries: 0 });
    if (!lockId) {
      return NextResponse.json({ ok: false, message: "locked" }, { status: 202 });
    }

    try {
      return await executeIngest(req);
    } finally {
      await releaseLock("cron:national-ingest", lockId);
    }
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}

async function executeIngest(req: Request) {
  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid query", details: parsed.error }, { status: 400 });
  }

  const { limit, dry } = parsed.data;
  const dryRun = dry === "1" || dry === "true";

  // Execute run
  const result = await executeNationalIngestRun({
    limit,
    dryRun,
  });

  if (!result.success) {
    return NextResponse.json(
      {
        ok: false,
        error: result.error || "Ingestion failed",
        jobId: result.jobId,
        discovered: result.discovered,
        upserted: result.upserted,
        errors: result.errors,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    dryRun,
    jobId: result.jobId,
    discovered: result.discovered,
    upserted: result.upserted,
    errors: result.errors,
    cursorIn: result.cursorIn,
    cursorOut: result.cursorOut,
  });
}

