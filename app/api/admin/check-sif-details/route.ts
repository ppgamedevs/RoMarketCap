/**
 * Check exact details of SIF companies
 */

import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import * as Sentry from "@sentry/nextjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const cuis = ["2761040", "2816954", "3047687", "3168735", "2689271", "34270612", "26405652", "37282445", "5765547"];
    
    const companies = await prisma.company.findMany({
      where: {
        cui: { in: cuis },
      },
      select: {
        cui: true,
        name: true,
        marketCap: true,
        isListed: true,
        stockSymbol: true,
        stockExchange: true,
        dataConfidence: true,
        isPublic: true,
        isSkeleton: true,
        mergedIntoCompanyId: true,
      },
    });

    return NextResponse.json({
      ok: true,
      companies: companies.map(c => ({
        cui: c.cui,
        name: c.name,
        marketCap: c.marketCap ? Number(c.marketCap) : null,
        isListed: c.isListed,
        stockSymbol: c.stockSymbol,
        stockExchange: c.stockExchange,
        dataConfidence: c.dataConfidence,
        isPublic: c.isPublic,
        isSkeleton: c.isSkeleton,
        mergedIntoCompanyId: c.mergedIntoCompanyId,
        shouldAppearInRanking: c.isPublic && !c.isSkeleton && !c.mergedIntoCompanyId && c.dataConfidence && c.dataConfidence >= 40,
      })),
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[check-sif-details] Error:", error);
    Sentry.captureException(error);
    
    return NextResponse.json({
      ok: false,
      error: errorMsg,
    }, { status: 500 });
  }
}
