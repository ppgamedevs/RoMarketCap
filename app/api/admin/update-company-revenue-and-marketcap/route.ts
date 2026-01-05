/**
 * Admin endpoint to update revenue data from seed files and recalculate market caps
 * 
 * This ensures companies have real revenue data and accurate market cap estimates
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { prisma } from "@/src/lib/db";
import { Prisma } from "@prisma/client";
import { estimateMarketCap } from "@/src/lib/valuation/estimateMarketCap";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 600; // 10 minutes

type RevenueData = {
  lastUpdated: string;
  source: string;
  currency: string;
  companies: Record<string, {
    name: string;
    revenue: number;
    employees?: number;
    industry?: string;
    note?: string;
  }>;
};

export async function GET(req: NextRequest) {
  return POST(req);
}

export async function POST(req: NextRequest) {
  try {
    await requireAdminSession();

    const url = new URL(req.url);
    const dryRun = url.searchParams.get("dryRun") === "true";
    const seedFile = url.searchParams.get("seedFile") || "major-companies-revenue"; // major or medium

    const results = {
      revenueUpdated: 0,
      marketCapUpdated: 0,
      notFound: 0,
      errors: 0,
      errorDetails: [] as Array<{ cui: string; error: string }>,
    };

    // Read revenue data from JSON file
    const dataPath = path.join(process.cwd(), "data", "seeds", `${seedFile}.json`);
    
    if (!fs.existsSync(dataPath)) {
      return NextResponse.json({
        ok: false,
        error: `Revenue data file not found: ${seedFile}.json`,
      }, { status: 404 });
    }

    const fileContent = fs.readFileSync(dataPath, "utf-8");
    const revenueData: RevenueData = JSON.parse(fileContent);

    console.log(`[update-revenue-marketcap] Processing ${Object.keys(revenueData.companies).length} companies from ${seedFile}.json...`);

    for (const [cui, data] of Object.entries(revenueData.companies)) {
      try {
        // Find company by CUI
        const company = await prisma.company.findFirst({
          where: { cui },
          select: {
            id: true,
            name: true,
            industry: true,
            revenueLatest: true,
            employees: true,
            marketCap: true,
            valuationRangeLow: true,
            valuationRangeHigh: true,
          },
        });

        if (!company) {
          results.notFound++;
          console.warn(`[update-revenue-marketcap] Company not found: ${data.name} (CUI: ${cui})`);
          continue;
        }

        // Update revenue and employees
        if (!dryRun) {
          await prisma.company.update({
            where: { id: company.id },
            data: {
              revenueLatest: new Prisma.Decimal(data.revenue),
              ...(data.employees ? { employees: data.employees } : {}),
              ...(data.industry ? { industry: data.industry } : {}),
            },
          });
          results.revenueUpdated++;
        }

        // Calculate new market cap based on updated revenue
        const estimate = estimateMarketCap({
          industry: data.industry || company.industry,
          revenueLatest: data.revenue,
          employees: data.employees || company.employees,
          valuationRangeLow: company.valuationRangeLow,
          valuationRangeHigh: company.valuationRangeHigh,
        });

        if (estimate) {
          if (!dryRun) {
            await prisma.company.update({
              where: { id: company.id },
              data: {
                marketCap: new Prisma.Decimal(estimate.estimatedMarketCap),
                lastPriceAt: new Date(),
              },
            });
            results.marketCapUpdated++;
          }

          console.log(`[update-revenue-marketcap] ${company.name} (${cui}): Revenue ${data.revenue.toLocaleString()} RON → Market Cap ${estimate.estimatedMarketCap.toLocaleString()} RON (${estimate.method})`);
        } else {
          console.warn(`[update-revenue-marketcap] Could not estimate market cap for ${company.name} (${cui})`);
        }

      } catch (error) {
        results.errors++;
        const errorMsg = error instanceof Error ? error.message : String(error);
        results.errorDetails.push({ cui, error: errorMsg });
        console.error(`[update-revenue-marketcap] Error processing ${cui}:`, error);
      }
    }

    return NextResponse.json({
      ok: true,
      message: dryRun
        ? `Dry run: Would update revenue for ${results.revenueUpdated} companies and market cap for ${results.marketCapUpdated} companies`
        : `Updated revenue for ${results.revenueUpdated} companies and market cap for ${results.marketCapUpdated} companies`,
      dryRun,
      seedFile,
      ...results,
    });

  } catch (error) {
    console.error("[update-revenue-marketcap] Fatal error:", error);
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
