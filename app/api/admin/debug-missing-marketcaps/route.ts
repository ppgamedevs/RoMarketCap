/**
 * Debug endpoint to find companies with revenue but no market cap
 */

import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import * as Sentry from "@sentry/nextjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    // Get companies with revenue but no market cap
    const companies = await prisma.company.findMany({
      where: {
        revenueLatest: { not: null },
        OR: [
          { marketCap: null },
          { marketCap: 0 },
        ],
      },
      select: {
        cui: true,
        name: true,
        industry: true,
        revenueLatest: true,
        employees: true,
        marketCap: true,
        isPublic: true,
        isSkeleton: true,
        mergedIntoCompanyId: true,
        dataConfidence: true,
      },
      orderBy: { revenueLatest: "desc" },
      take: 50,
    });

    return NextResponse.json({
      ok: true,
      total: companies.length,
      companies: companies.map(c => ({
        cui: c.cui,
        name: c.name,
        industry: c.industry,
        revenueLatest: c.revenueLatest ? Number(c.revenueLatest) : null,
        employees: c.employees,
        marketCap: c.marketCap ? Number(c.marketCap) : null,
        isPublic: c.isPublic,
        isSkeleton: c.isSkeleton,
        mergedIntoCompanyId: c.mergedIntoCompanyId,
        dataConfidence: c.dataConfidence,
        reason: !c.isPublic ? "NOT_PUBLIC" :
                c.isSkeleton ? "IS_SKELETON" :
                c.mergedIntoCompanyId ? "IS_MERGED" :
                "SHOULD_HAVE_MARKETCAP",
      })),
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[debug-missing-marketcaps] Error:", error);
    Sentry.captureException(error);
    
    return NextResponse.json({
      ok: false,
      error: errorMsg,
    }, { status: 500 });
  }
}
