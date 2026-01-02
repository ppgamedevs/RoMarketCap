/**
 * Debug endpoint to check which companies have revenue but no market cap
 */

import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Find companies with revenue but no market cap
    const companiesWithRevenue = await prisma.company.findMany({
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
        revenueLatest: true,
        employees: true,
        industry: true,
        isPublic: true,
        isSkeleton: true,
        isListed: true,
        marketCap: true,
        dataConfidence: true,
      },
      orderBy: { revenueLatest: "desc" },
      take: 50,
    });

    return NextResponse.json({
      ok: true,
      total: companiesWithRevenue.length,
      companies: companiesWithRevenue.map(c => ({
        cui: c.cui,
        name: c.name,
        revenue: c.revenueLatest ? Number(c.revenueLatest).toLocaleString() : null,
        employees: c.employees,
        industry: c.industry,
        isPublic: c.isPublic,
        isSkeleton: c.isSkeleton,
        isListed: c.isListed,
        marketCap: c.marketCap,
        dataConfidence: c.dataConfidence,
      })),
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({
      ok: false,
      error: errorMsg,
    }, { status: 500 });
  }
}
