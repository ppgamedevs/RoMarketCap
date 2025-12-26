import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/src/lib/db";
import { kv } from "@vercel/kv";
import { notifyCritical } from "@/src/lib/alerts/critical";
import { acquireLockWithRetry } from "@/src/lib/locks/distributed";
import { isFlagEnabled } from "@/src/lib/flags/flags";
import * as Sentry from "@sentry/nextjs";
import { processNationalIngestionRow, type NationalIngestionRow } from "@/src/lib/ingestion/provenance";
import { isValidCUI, normalizeCUI } from "@/src/lib/ingestion/cuiValidation";
import Papa from "papaparse";
import { Readable } from "stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  source: z.enum(["SEAP", "EU_FUNDS"]).optional(),
  limit: z.coerce.number().int().min(1).max(1000).optional().default(100),
  dry: z.string().optional(),
  cursor: z.string().optional(),
});

// Rate limiting: max 1000 rows per run
const MAX_ROWS_PER_RUN = 1000;

async function streamCSVFromURL(url: string): Promise<NodeJS.ReadableStream> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch CSV: ${response.statusText}`);
  }
  if (!response.body) {
    throw new Error("Response body is null");
  }
  // Convert web stream to Node.js stream
  return Readable.fromWeb(response.body as any) as NodeJS.ReadableStream;
}

async function processCSVStream(
  stream: NodeJS.ReadableStream,
  sourceName: "SEAP" | "EU_FUNDS",
  limit: number,
  cursor: string | null,
  dryRun: boolean,
): Promise<{
  processed: number;
  created: number;
  updated: number;
  errors: number;
  nextCursor: string | null;
}> {
  const stats = {
    processed: 0,
    created: 0,
    updated: 0,
    errors: 0,
  };

  let currentCursor = cursor;
  let rowNumber = 0;
  let processedCount = 0;

  return new Promise((resolve, reject) => {
    // Papa.parse accepts NodeJS.ReadableStream, but types may need casting
    Papa.parse(stream as any, {
      header: true,
      skipEmptyLines: true,
      step: async (result: any, parser: any) => {
        rowNumber++;

        // Skip until cursor
        if (currentCursor && rowNumber <= parseInt(currentCursor, 10)) {
          return;
        }

        // Rate limit
        if (processedCount >= limit) {
          parser.abort();
          resolve({
            ...stats,
            nextCursor: rowNumber.toString(),
          });
          return;
        }

        processedCount++;
        stats.processed++;

        try {
          const row = result.data as Record<string, unknown>;
          const cui = normalizeCUI((row.cui as string) || "");

          if (!cui || !isValidCUI(cui)) {
            stats.errors++;
            return;
          }

          // Normalize row based on source
          // Helper to safely extract numeric/string value
          const getValue = (val: unknown): number | string | null => {
            if (val === null || val === undefined) return null;
            if (typeof val === "number" || typeof val === "string") return val;
            return null;
          };

          const normalized: NationalIngestionRow = {
            name: (row.nume_firma || row.denumire || row.nume || row.beneficiar || "") as string,
            cui,
            contractValue: getValue(row.valoare) || getValue(row.valoare_contract) || getValue(row.valoare_proiect) || null,
            contractYear: getValue(row.an) || getValue(row.an_contract) || getValue(row.an_proiect) || null,
            contractingAuthority: (row.autoritate_contractanta || row.nume_autoritate || row.program || row.nume_program || null) as string | null,
            externalId: (row.id_contract || row.contract_id || row.id_proiect || row.proiect_id || row.id || null) as string | null,
          };

          if (!normalized.name || normalized.name.trim().length < 2) {
            stats.errors++;
            return;
          }

          if (!dryRun) {
            const result = await processNationalIngestionRow(normalized, sourceName, row);
            if (result.created) stats.created++;
            if (result.provenanceUpdated) stats.updated++;
          } else {
            stats.created++; // Count as would-be created in dry run
          }
        } catch (error) {
          stats.errors++;
          console.error(`[ingest-national] Row ${rowNumber} error:`, error);
        }
      },
      complete: () => {
        resolve({
          ...stats,
          nextCursor: processedCount >= limit ? rowNumber.toString() : null,
        });
      },
      error: (error) => {
        reject(error);
      },
    } as any);
  });
}

export async function POST(req: Request) {
  try {
    // Check feature flag
    const cronEnabled = await isFlagEnabled("CRON_INGEST_NATIONAL", false);
    if (!cronEnabled) {
      return NextResponse.json({ ok: false, error: "National ingestion cron is disabled via feature flag" }, { status: 503 });
    }

    const secret = process.env.CRON_SECRET;
    const got = req.headers.get("x-cron-secret");
    if (!secret || got !== secret) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    // Check for lock
    const lockId = await acquireLockWithRetry("cron:ingest-national", { ttl: 3600, maxRetries: 0 });
    if (!lockId) {
      return NextResponse.json({ ok: false, message: "locked" }, { status: 202 });
    }

    try {
      return await executeIngest(req);
    } finally {
      await import("@/src/lib/locks/distributed").then(({ releaseLock }) => releaseLock("cron:ingest-national", lockId));
    }
  } catch (error) {
    Sentry.captureException(error);
    await notifyCritical({ route: "/api/cron/ingest-national", message: error instanceof Error ? error.message : "Unknown error" });
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
  const limit = Math.min(parsed.data.limit || 100, MAX_ROWS_PER_RUN);
  const source = parsed.data.source || "SEAP";
  const cursorKey = `cron:ingest-national:cursor:${source}`;
  const cursor = parsed.data.cursor || ((await kv.get<string>(cursorKey).catch(() => null)) ?? null);

  // For now, we expect CSV URLs in environment variables
  // In production, these would be configured data source URLs
  const seapUrl = process.env.SEAP_CSV_URL;
  const euFundsUrl = process.env.EU_FUNDS_CSV_URL;

  if (source === "SEAP" && !seapUrl) {
    return NextResponse.json({ ok: false, error: "SEAP_CSV_URL not configured" }, { status: 400 });
  }
  if (source === "EU_FUNDS" && !euFundsUrl) {
    return NextResponse.json({ ok: false, error: "EU_FUNDS_CSV_URL not configured" }, { status: 400 });
  }

  const csvUrl = source === "SEAP" ? seapUrl! : euFundsUrl!;

  try {
    const stream = await streamCSVFromURL(csvUrl);
    const stats = await processCSVStream(stream, source, limit, cursor, dryRun);

    if (!dryRun) {
      if (stats.nextCursor) {
        await kv.set(cursorKey, stats.nextCursor, { ex: 60 * 60 * 24 * 7 }).catch(() => null);
      } else {
        await kv.del(cursorKey).catch(() => null);
      }
      await kv.set(`cron:last:ingest-national:${source}`, new Date().toISOString(), { ex: 60 * 60 * 24 * 7 }).catch(() => null);
      await kv.set(
        `cron:stats:ingest-national:${source}`,
        JSON.stringify({ ...stats, ts: new Date().toISOString() }),
        { ex: 60 * 60 * 24 * 7 },
      ).catch(() => null);
    }

    return NextResponse.json({
      ok: true,
      source,
      ...stats,
      dry: dryRun,
    });
  } catch (error) {
    console.error(`[ingest-national:${source}] Error:`, error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
        source,
      },
      { status: 500 },
    );
  }
}

