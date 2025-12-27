/**
 * PROMPT 61: National ingestion run orchestrator
 * 
 * Orchestrates one ingestion batch with retries and deadletter handling.
 */

import { prisma } from "@/src/lib/db";
import { Prisma } from "@prisma/client";
import { fetchCUIsFromSources } from "./sources";
import { upsertCompaniesFromCuis } from "./upsert";
import { readCursor, writeCursor, writeLastRunStats } from "./checkpoint";
import * as Sentry from "@sentry/nextjs";

export type NationalIngestRunOptions = {
  limit: number;
  dryRun: boolean;
  cursor?: string | null;
};

export type NationalIngestRunResult = {
  success: boolean;
  jobId: string | null;
  discovered: number;
  upserted: number;
  errors: number;
  cursorIn: string | null;
  cursorOut: string | null;
  error?: string;
};

/**
 * Execute one national ingestion run
 */
export async function executeNationalIngestRun(
  options: NationalIngestRunOptions
): Promise<NationalIngestRunResult> {
  const { limit, dryRun, cursor: providedCursor } = options;
  const startTime = Date.now();

  // Read cursor if not provided
  const cursorIn = providedCursor || (await readCursor());

  // Create job record
  let jobId: string | null = null;
  if (!dryRun) {
    try {
      const job = await prisma.nationalIngestJob.create({
        data: {
          status: "STARTED",
          mode: dryRun ? "DRY_RUN" : "LIVE",
          limit,
          cursorIn,
          discovered: 0,
          upserted: 0,
          errors: 0,
        },
      });
      jobId = job.id;
    } catch (error) {
      console.error("[national-ingest] Error creating job:", error);
      return {
        success: false,
        jobId: null,
        discovered: 0,
        upserted: 0,
        errors: 0,
        cursorIn,
        cursorOut: cursorIn,
        error: error instanceof Error ? error.message : "Failed to create job",
      };
    }
  }

  try {
    // Fetch CUIs from sources
    const fetchResult = await fetchCUIsFromSources({
      limit,
      cursor: cursorIn || undefined,
    });

    const discovered = fetchResult.cuis.length;
    let upserted = 0;
    let errors = 0;
    const errorDetails: Array<{ cui: string; sourceType: string; reason: string }> = [];

    if (!dryRun && discovered > 0) {
      // Upsert companies
      const upsertResult = await upsertCompaniesFromCuis(fetchResult.cuis, false);
      upserted = upsertResult.created + upsertResult.updated;
      errors = upsertResult.errors;

      // Record errors
      if (jobId && upsertResult.errorDetails.length > 0) {
        for (const error of upsertResult.errorDetails) {
          const cuiData = fetchResult.cuis.find((c) => c.cui === error.cui);
          try {
            await prisma.nationalIngestError.create({
              data: {
                jobId,
                cui: error.cui,
                sourceType: cuiData?.sourceType || "UNKNOWN",
                sourceRef: cuiData?.sourceRef || null,
                reason: error.error,
                rawPayload: cuiData?.raw ? (cuiData.raw as Prisma.InputJsonValue) : Prisma.JsonNull,
              },
            });
          } catch (err) {
            console.error("[national-ingest] Error recording error:", err);
          }
        }
      }
    } else if (dryRun) {
      // In dry run, count what would be upserted
      const dryRunResult = await upsertCompaniesFromCuis(fetchResult.cuis, true);
      upserted = dryRunResult.created + dryRunResult.updated;
    }

    const cursorOut = fetchResult.nextCursor || cursorIn;
    const status = errors > 0 && errors < discovered ? "PARTIAL" : errors === 0 ? "COMPLETED" : "FAILED";

    // Update job
    if (jobId) {
      await prisma.nationalIngestJob.update({
        where: { id: jobId },
        data: {
          status,
          finishedAt: new Date(),
          cursorOut,
          discovered,
          upserted,
          errors,
          stats: fetchResult.stats as Prisma.InputJsonValue,
        },
      });
    }

    // Update checkpoint
    if (!dryRun) {
      await writeCursor(cursorOut);
      await writeLastRunStats({
        discovered,
        upserted,
        errors,
        lastRunAt: new Date().toISOString(),
        cursor: cursorOut,
      });
    }

    return {
      success: true,
      jobId,
      discovered,
      upserted,
      errors,
      cursorIn,
      cursorOut,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("[national-ingest] Run failed:", error);
    Sentry.captureException(error, {
      tags: { module: "national_ingest", jobId },
    });

    // Update job status
    if (jobId) {
      await prisma.nationalIngestJob.update({
        where: { id: jobId },
        data: {
          status: "FAILED",
          finishedAt: new Date(),
          notes: errorMsg,
        },
      }).catch(() => null);
    }

    return {
      success: false,
      jobId,
      discovered: 0,
      upserted: 0,
      errors: 0,
      cursorIn,
      cursorOut: cursorIn,
      error: errorMsg,
    };
  }
}

