/**
 * Admin endpoint to check companies without market caps
 */

import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const companies = await prisma.company.findMany({
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
        id: true,
        cui: true,
        name: true,
        industry: true,
        isListed: true,
        revenueLatest: true,
        employees: true,
        dataConfidence: true,
        createdAt: true,
      },
      orderBy: { dataConfidence: "desc" },
      take: 100,
    });

    const summary = {
      total: companies.length,
      hasRevenue: companies.filter(c => c.revenueLatest && Number(c.revenueLatest) > 0).length,
      hasEmployees: companies.filter(c => c.employees && c.employees > 0).length,
      isListed: companies.filter(c => c.isListed).length,
      hasNoData: companies.filter(c => 
        (!c.revenueLatest || Number(c.revenueLatest) === 0) && 
        (!c.employees || c.employees === 0)
      ).length,
    };

    return NextResponse.json({
      ok: true,
      summary,
      companies: companies.map(c => ({
        cui: c.cui,
        name: c.name,
        industry: c.industry,
        isListed: c.isListed,
        hasRevenue: !!c.revenueLatest && Number(c.revenueLatest) > 0,
        hasEmployees: !!c.employees && c.employees > 0,
        confidence: c.dataConfidence,
        createdAt: c.createdAt,
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
