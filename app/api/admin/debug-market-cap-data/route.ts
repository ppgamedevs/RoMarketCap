/**
 * Debug endpoint to check which companies have data for market cap estimation
 */

import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import * as Sentry from "@sentry/nextjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    // Get all companies without market caps
    const companiesWithoutMarketCap = await prisma.company.findMany({
      where: {
        OR: [
          { marketCap: null },
          { marketCap: 0 },
        ],
        isPublic: true,
        isSkeleton: false,
        mergedIntoCompanyId: null,
      },
      select: {
        cui: true,
        name: true,
        industry: true,
        revenueLatest: true,
        employees: true,
        valuationRangeLow: true,
        valuationRangeHigh: true,
        marketCap: true,
        dataConfidence: true,
      },
      orderBy: [
        { revenueLatest: "desc" },
      ],
      take: 50, // Top 50 by revenue
    });

    // Analyze data availability
    let hasRevenue = 0;
    let hasEmployees = 0;
    let hasValuation = 0;
    let hasNothing = 0;

    const companies = companiesWithoutMarketCap.map(c => {
      const hasRev = c.revenueLatest && Number(c.revenueLatest) > 0;
      const hasEmp = c.employees && c.employees > 0;
      const hasVal = c.valuationRangeLow && Number(c.valuationRangeLow) > 0;

      if (hasRev) hasRevenue++;
      if (hasEmp) hasEmployees++;
      if (hasVal) hasValuation++;
      if (!hasRev && !hasEmp && !hasVal) hasNothing++;

        return {
          cui: c.cui,
          name: c.name,
          industry: c.industry,
          revenueLatest: c.revenueLatest ? Number(c.revenueLatest) : null,
          employees: c.employees,
          valuationRange: c.valuationRangeLow ? 
            `${Number(c.valuationRangeLow)} - ${c.valuationRangeHigh ? Number(c.valuationRangeHigh) : 0}` : 
            null,
          marketCap: c.marketCap ? Number(c.marketCap) : null,
          dataConfidence: c.dataConfidence,
          canEstimate: hasRev || hasEmp || hasVal,
          reason: !hasRev && !hasEmp && !hasVal ? "NO_DATA" :
                  hasRev ? "HAS_REVENUE" :
                  hasEmp ? "HAS_EMPLOYEES" :
                  "HAS_VALUATION",
        };
      });

    return NextResponse.json({
      ok: true,
      total: companiesWithoutMarketCap.length,
      hasRevenue,
      hasEmployees,
      hasValuation,
      hasNothing,
      companies,
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[debug-market-cap-data] Error:", error);
    Sentry.captureException(error);
    
    return NextResponse.json({
      ok: false,
      error: errorMsg,
    }, { status: 500 });
  }
}
