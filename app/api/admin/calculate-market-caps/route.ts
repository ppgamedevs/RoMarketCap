/**
 * Admin endpoint to calculate estimated market caps for all companies
 * 
 * - Keeps actual market caps for BVB listed companies
 * - Calculates estimates for private companies using revenue multiples
 * - Uses hybrid approach (revenue + assets) for certain industries
 */

import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { Prisma } from "@prisma/client";
import * as Sentry from "@sentry/nextjs";
import { estimateMarketCap } from "@/src/lib/valuation/estimateMarketCap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 600; // 10 minutes (increased for processing all companies)

export async function GET(req: Request) {
  return POST(req);
}

export async function POST(req: Request) {
  const startTime = Date.now();
  
  // Parse query params for options
  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dryRun") === "true";
  const batchSize = parseInt(url.searchParams.get("batchSize") || "100");
  const cursor = url.searchParams.get("cursor") || undefined;
  const overwriteListed = url.searchParams.get("overwriteListed") === "true"; // Don't overwrite BVB by default
  const processAll = url.searchParams.get("processAll") === "true"; // Process all companies in one go

  try {
    const results = {
      total: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
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
    };

    // Determine actual batch size
    const actualBatchSize = processAll ? 10000 : batchSize; // Process all if processAll=true

    // Fetch companies that need market cap estimation
    const companies = await prisma.company.findMany({
      where: {
        ...(cursor ? { id: { gt: cursor } } : {}),
        // Skip if already has market cap (unless overwriting)
        ...(!overwriteListed ? {
          OR: [
            { marketCap: null },
            { marketCap: 0 },
          ],
        } : {}),
        // Only process public, non-skeleton, non-merged companies
        isPublic: true,
        isSkeleton: false,
        mergedIntoCompanyId: null,
      },
      select: {
        id: true,
        cui: true,
        name: true,
        industry: true,
        isListed: true,
        marketCap: true,
        revenueLatest: true,
        employees: true,
        valuationRangeLow: true,
        valuationRangeHigh: true,
      },
      orderBy: { id: "asc" },
      take: actualBatchSize,
    });

    results.total = companies.length;

    if (companies.length === 0) {
      return NextResponse.json({
        ok: true,
        message: "No companies need market cap calculation",
        done: true,
        dryRun,
        ...results,
      });
    }

    console.log(`[calculate-market-caps] Processing ${companies.length} companies (dry run: ${dryRun})...`);

    // Process each company
    for (const company of companies) {
      try {
        // Skip if already has market cap and not overwriting
        if (company.marketCap && Number(company.marketCap) > 0 && !overwriteListed) {
          results.skipped++;
          results.byMethod.already_has_marketcap++;
          continue;
        }

        // Calculate estimated market cap
        const estimate = estimateMarketCap({
          industry: company.industry,
          revenueLatest: company.revenueLatest,
          employees: company.employees,
          valuationRangeLow: company.valuationRangeLow,
          valuationRangeHigh: company.valuationRangeHigh,
        });

        if (!estimate) {
          results.skipped++;
          results.byMethod.no_data++;
          console.log(`[calculate-market-caps] No data to estimate market cap for ${company.name} (${company.cui})`);
          continue;
        }

        // Track method used
        results.byMethod[estimate.method]++;

        if (!dryRun) {
          // Update company with estimated market cap
          await prisma.company.update({
            where: { id: company.id },
            data: {
              marketCap: new Prisma.Decimal(estimate.estimatedMarketCap),
              lastPriceAt: new Date(), // Use current date for estimates
            },
          });
        }

        results.updated++;
        
        if (results.updated % 10 === 0) {
          console.log(`[calculate-market-caps] Processed ${results.updated}/${results.total}...`);
        }

      } catch (error) {
        results.errors++;
        const errorMsg = error instanceof Error ? error.message : String(error);
        results.errorDetails.push({ cui: company.cui || "unknown", error: errorMsg });
        console.error(`[calculate-market-caps] Error processing ${company.cui}:`, error);
        Sentry.captureException(error, {
          tags: { component: "calculate-market-caps", cui: company.cui || "unknown" },
        });
      }
    }

    const duration = Date.now() - startTime;
    const nextCursor = companies.length === actualBatchSize ? companies[companies.length - 1].id : null;

    console.log(`[calculate-market-caps] Completed: ${results.updated} updated, ${results.skipped} skipped, ${results.errors} errors in ${duration}ms`);

    // If processAll and there are more companies, provide instructions to continue
    const hasMore = nextCursor !== null;
    const continueMessage = hasMore && processAll
      ? `Processed ${results.updated} companies. More companies may need processing. Run again with ?processAll=true&cursor=${nextCursor} to continue.`
      : null;

    return NextResponse.json({
      ok: true,
      message: dryRun 
        ? `Dry run: Would update ${results.updated} companies`
        : `Updated ${results.updated} companies with estimated market caps`,
      dryRun,
      processAll,
      cursor: nextCursor,
      done: !nextCursor,
      hasMore,
      continueMessage,
      duration,
      ...results,
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[calculate-market-caps] Fatal error:", error);
    Sentry.captureException(error);
    
    return NextResponse.json({
      ok: false,
      error: errorMsg,
    }, { status: 500 });
  }
}
