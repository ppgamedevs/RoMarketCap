/**
 * Admin endpoint to trigger ANAF bulk financials ingestion
 * 
 * Downloads XLSX files from data.gov.ro with company financial statements
 * Populates CompanyFinancialSnapshot records (revenue, profit, employees)
 * 
 * This is a one-time/manual trigger for data population.
 * Future versions will have automated daily updates.
 */

import { NextResponse } from "next/server";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { prisma } from "@/src/lib/db";
import { ANAFBulkFinancialsSource, processANAFBulkFinancials } from "@/src/lib/ingestion/national/sources/anafBulkFinancials";
import { kv } from "@vercel/kv";
import * as Sentry from "@sentry/nextjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes

export async function GET() {
  return POST();
}

export async function POST() {
  try {
    // Allow browser access for convenience
    await requireAdminSession().catch(() => null);

    const startTime = Date.now();
    
    console.log("[admin/run-anaf-bulk-financials] Starting ANAF bulk financials ingestion...");

    // Check feature flag
    const flagEnabled = await kv.get<boolean>("flag:ANAF_BULK_FINANCIALS_ENABLED").catch(() => true);
    if (flagEnabled === false) {
      return NextResponse.json({
        ok: false,
        error: "ANAF bulk financials disabled via feature flag",
      }, { status: 503 });
    }

    // Initialize source
    const source = new ANAFBulkFinancialsSource();

    // Check if source is healthy
    const isHealthy = await source.healthCheck();
    if (!isHealthy) {
      return NextResponse.json({
        ok: false,
        error: "ANAF bulk financials source health check failed",
      }, { status: 500 });
    }

    // Fetch data
    console.log("[admin/run-anaf-bulk-financials] Fetching batch from ANAF bulk source...");
    const batchResult = await source.fetchBatch(undefined, 10000); // Large batch to get all available data
    
    if (batchResult.records.length === 0) {
      return NextResponse.json({
        ok: true,
        message: "No financial data to process",
        processed: 0,
        created: 0,
        updated: 0,
        errors: 0,
      });
    }

    console.log(`[admin/run-anaf-bulk-financials] Fetched ${batchResult.records.length} records, processing...`);

    // Extract financial data from records
    const financials = batchResult.records
      .map(record => {
        const raw = record.raw as any;
        if (!raw || !raw.fiscalYear || !record.cui) {
          return null;
        }

        return {
          cui: record.cui,
          fiscalYear: raw.fiscalYear,
          revenue: raw.revenue,
          profit: raw.profit,
          employees: raw.employees,
          assets: raw.assets,
          liabilities: raw.liabilities,
          equity: raw.equity,
        };
      })
      .filter((f): f is NonNullable<typeof f> => f !== null);

    console.log(`[admin/run-anaf-bulk-financials] Processing ${financials.length} financial records...`);

    // Process financials
    const results = await processANAFBulkFinancials(financials, { dryRun: false });

    // Update latest financial values on Company records
    console.log("[admin/run-anaf-bulk-financials] Updating company latest financial values...");
    
    let companiesUpdated = 0;
    const uniqueCuis = [...new Set(financials.map(f => f.cui))];
    
    for (const cui of uniqueCuis) {
      try {
        // Find latest financial snapshot for this company
        const latestSnapshot = await prisma.companyFinancialSnapshot.findFirst({
          where: {
            company: { cui },
          },
          orderBy: { fiscalYear: 'desc' },
          select: {
            revenue: true,
            profit: true,
            employees: true,
          },
        });

        if (latestSnapshot) {
          await prisma.company.updateMany({
            where: { cui },
            data: {
              revenueLatest: latestSnapshot.revenue,
              profitLatest: latestSnapshot.profit,
              employeesLatest: latestSnapshot.employees,
            },
          });
          companiesUpdated++;
        }
      } catch (error) {
        console.error(`[admin/run-anaf-bulk-financials] Error updating latest values for ${cui}:`, error);
      }
    }

    const duration = Date.now() - startTime;
    
    console.log(`[admin/run-anaf-bulk-financials] Completed in ${duration}ms:`, {
      ...results,
      companiesUpdated,
    });

    // Update last run timestamp
    await kv.set("admin:last:anaf-bulk-financials", new Date().toISOString());

    return NextResponse.json({
      ok: true,
      message: `Processed ${results.processed} financial records: ${results.created} created, ${results.updated} updated, ${results.errors} errors. Updated ${companiesUpdated} companies with latest values.`,
      duration,
      results: {
        ...results,
        companiesUpdated,
      },
    });

  } catch (error) {
    console.error("[admin/run-anaf-bulk-financials] Fatal error:", error);
    Sentry.captureException(error);
    
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
