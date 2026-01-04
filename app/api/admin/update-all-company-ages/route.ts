/**
 * Update All Company Ages (Automated)
 * 
 * Processes all companies in batches using cursor pagination.
 * This endpoint will continue until all companies are processed.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdminSession();

    const url = new URL(req.url);
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const batchSize = parseInt(url.searchParams.get("batchSize") || "3"); // Reduced to 3 to avoid Vercel timeout (each takes ~15-20s)
    const maxBatches = parseInt(url.searchParams.get("maxBatches") || "5"); // Reduced to 5 batches per call to avoid timeout (15 companies max)
    const useWebSearch = url.searchParams.get("useWebSearch") !== "false"; // Default true
    const reprocessSuspect = url.searchParams.get("reprocessSuspect") === "true"; // Also process companies with 2020+ dates
    const startCursor = url.searchParams.get("cursor") || undefined; // Allow resuming from cursor

    let cursor: string | undefined = startCursor;
    let totalProcessed = 0;
    let totalUpdated = 0;
    const batches: Array<{ batch: number; processed: number; updated: number; cursor?: string; debug?: any }> = [];
    let allDone = false;

    for (let batch = 1; batch <= maxBatches; batch++) {
      const apiUrl = new URL(`${baseUrl}/api/admin/update-company-ages`);
      apiUrl.searchParams.set("useWebSearch", useWebSearch ? "true" : "false");
      apiUrl.searchParams.set("batchSize", batchSize.toString());
      if (reprocessSuspect) {
        apiUrl.searchParams.set("reprocessSuspect", "true");
      }
      if (cursor) {
        apiUrl.searchParams.set("cursor", cursor);
      }

      console.log(`[update-all-ages] Batch ${batch}: Processing with cursor ${cursor || "none"}`);

      const response = await fetch(apiUrl.toString(), {
        headers: {
          "Cookie": req.headers.get("cookie") || "",
        },
      });

      if (!response.ok) {
        throw new Error(`Batch ${batch} failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.ok) {
        throw new Error(`Batch ${batch} error: ${data.error}`);
      }

      totalProcessed += data.processed || 0;
      totalUpdated += data.updated || 0;
      cursor = data.nextCursor;
      const done = data.done;

      batches.push({
        batch,
        processed: data.processed || 0,
        updated: data.updated || 0,
        cursor,
        debug: data.debug, // Include debug info from individual batch
      });

      console.log(`[update-all-ages] Batch ${batch} complete: ${data.processed} processed, ${data.updated} updated`);

      if (done || !cursor || data.processed === 0) {
        console.log(`[update-all-ages] All companies processed (done: ${done}, cursor: ${cursor}, processed: ${data.processed})`);
        allDone = true;
        break;
      }

      // Small delay between batches to avoid overwhelming the system
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Aggregate debug info from all batches
    const debugSummary = {
      totalWithFoundedYear: 0,
      totalWithFoundedAt: 0,
      totalSuspectDates: 0,
      totalNoData: 0,
      sampleBatches: batches.filter((b: any) => b.debug).slice(0, 3).map((b: any) => b.debug),
    };
    
    for (const batch of batches) {
      const batchDebug = (batch as any).debug;
      if (batchDebug?.summary) {
        debugSummary.totalWithFoundedYear += batchDebug.summary.withFoundedYear || 0;
        debugSummary.totalWithFoundedAt += batchDebug.summary.withFoundedAt || 0;
        debugSummary.totalSuspectDates += batchDebug.summary.suspectDates || 0;
        debugSummary.totalNoData += batchDebug.summary.noData || 0;
      }
    }

    return NextResponse.json({
      ok: true,
      message: allDone
        ? `✅ All companies processed! Total: ${totalProcessed} processed, ${totalUpdated} updated`
        : `Processed ${totalProcessed} companies, updated ${totalUpdated}. More batches available.`,
      totalProcessed,
      totalUpdated,
      batchesProcessed: batches.length,
      batches,
      debug: debugSummary,
      nextCursor: cursor,
      done: allDone,
      continueUrl: !allDone && cursor
        ? `${baseUrl}/api/admin/update-all-company-ages?batchSize=${batchSize}&maxBatches=${maxBatches}&useWebSearch=${useWebSearch}&reprocessSuspect=${reprocessSuspect}&cursor=${cursor}`
        : null,
    });
  } catch (error) {
    console.error("[update-all-ages] Error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
