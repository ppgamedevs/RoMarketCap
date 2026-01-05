/**
 * Admin endpoint to calculate market caps for ALL companies
 * 
 * Processes all companies in batches until done.
 * Uses the existing calculate-market-caps logic but runs it repeatedly.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 600; // 10 minutes

export async function GET(req: NextRequest) {
  return POST(req);
}

export async function POST(req: NextRequest) {
  try {
    await requireAdminSession();

    const url = new URL(req.url);
    const dryRun = url.searchParams.get("dryRun") === "true";
    const batchSize = parseInt(url.searchParams.get("batchSize") || "100");
    const maxBatches = parseInt(url.searchParams.get("maxBatches") || "10"); // Safety limit

    const allResults = {
      batches: 0,
      totalUpdated: 0,
      totalSkipped: 0,
      totalErrors: 0,
      byMethod: {
        existing_valuation: 0,
        revenue_multiple: 0,
        hybrid: 0,
        asset_based: 0,
        minimal: 0,
        no_data: 0,
        already_has_marketcap: 0,
      },
      errorDetails: [] as Array<{ cui: string; error: string }>,
      batchDetails: [] as Array<{
        batch: number;
        updated: number;
        skipped: number;
        errors: number;
        duration: number;
      }>,
    };

    let cursor: string | undefined = undefined;
    let done = false;
    let batchCount = 0;

    console.log(`[calculate-all-market-caps] Starting to process all companies (dry run: ${dryRun}, batch size: ${batchSize})...`);

    // Process in batches until done or max batches reached
    while (!done && batchCount < maxBatches) {
      batchCount++;
      const batchStartTime = Date.now();

      // Build URL for calculate-market-caps endpoint
      const calculateUrl = new URL("/api/admin/calculate-market-caps", req.url);
      if (dryRun) calculateUrl.searchParams.set("dryRun", "true");
      calculateUrl.searchParams.set("batchSize", batchSize.toString());
      if (cursor) calculateUrl.searchParams.set("cursor", cursor);

      // Call the calculate-market-caps endpoint
      const response = await fetch(calculateUrl.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to process batch ${batchCount}: ${response.status} ${errorText}`);
      }

      const batchResult = await response.json();

      if (!batchResult.ok) {
        throw new Error(`Batch ${batchCount} failed: ${batchResult.error || "Unknown error"}`);
      }

      // Accumulate results
      allResults.batches = batchCount;
      allResults.totalUpdated += batchResult.updated || 0;
      allResults.totalSkipped += batchResult.skipped || 0;
      allResults.totalErrors += batchResult.errors || 0;

      // Accumulate by method
      if (batchResult.byMethod) {
        for (const [method, count] of Object.entries(batchResult.byMethod)) {
          if (typeof count === "number") {
            allResults.byMethod[method as keyof typeof allResults.byMethod] += count;
          }
        }
      }

      // Accumulate errors
      if (batchResult.errorDetails && Array.isArray(batchResult.errorDetails)) {
        allResults.errorDetails.push(...batchResult.errorDetails);
      }

      // Track batch details
      const batchDuration = Date.now() - batchStartTime;
      allResults.batchDetails.push({
        batch: batchCount,
        updated: batchResult.updated || 0,
        skipped: batchResult.skipped || 0,
        errors: batchResult.errors || 0,
        duration: batchDuration,
      });

      // Check if done
      done = batchResult.done === true || !batchResult.cursor;

      // Update cursor for next batch
      if (batchResult.cursor) {
        cursor = batchResult.cursor;
      }

      console.log(`[calculate-all-market-caps] Batch ${batchCount}: ${batchResult.updated || 0} updated, ${batchResult.skipped || 0} skipped, ${batchResult.errors || 0} errors (${batchDuration}ms)`);

      // If no companies were processed, we're done
      if (batchResult.total === 0) {
        done = true;
      }
    }

    const totalDuration = allResults.batchDetails.reduce((sum, b) => sum + b.duration, 0);

    return NextResponse.json({
      ok: true,
      message: dryRun
        ? `Dry run: Would update ${allResults.totalUpdated} companies across ${allResults.batches} batches`
        : `Updated ${allResults.totalUpdated} companies with estimated market caps across ${allResults.batches} batches`,
      dryRun,
      done,
      batchesProcessed: allResults.batches,
      maxBatchesReached: batchCount >= maxBatches && !done,
      totalDuration,
      ...allResults,
    });

  } catch (error) {
    console.error("[calculate-all-market-caps] Error:", error);
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
