/**
 * Test the exact market query to see what companies are returned
 */

import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { buildRankingGuard } from "@/src/lib/ranking/rankingGuard";
import { isLaunchMode } from "@/src/lib/launch/mode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "2");
    const pageSize = 50;
    const skip = (page - 1) * pageSize;

    // Build ranking guard (same as market API)
    const launchMode = isLaunchMode();
    const guard = buildRankingGuard(launchMode, { minDataConfidence: 0 });

    // Build orderBy for marketCap sort
    const orderBy = [
      { marketCap: "desc" },
      { valuationRangeHigh: "desc" },
      { romcAiScore: "desc" },
      { cui: "asc" }
    ];

    // Get total count
    const total = await prisma.company.count({ where: guard.where });

    // Fetch companies
    const companies = await prisma.company.findMany({
      where: guard.where,
      orderBy,
      skip,
      take: pageSize,
      select: {
        cui: true,
        name: true,
        marketCap: true,
        dataConfidence: true,
        isPublic: true,
        visibilityStatus: true,
        isSkeleton: true,
        mergedIntoCompanyId: true,
      },
    });

    // Find SIF companies in results
    const sifCompanies = companies.filter(c => 
      c.name?.includes("SIF") || 
      c.name?.includes("Visual Fan") || 
      c.name?.includes("Norofert") || 
      c.name?.includes("2Performant") || 
      c.name?.includes("SafeTech")
    );

    return NextResponse.json({
      ok: true,
      page,
      skip,
      total,
      companiesFound: companies.length,
      sifCompaniesFound: sifCompanies.length,
      sifCompanies: sifCompanies.map(c => ({
        cui: c.cui,
        name: c.name,
        marketCap: c.marketCap ? Number(c.marketCap) : null,
        dataConfidence: c.dataConfidence,
      })),
      firstFive: companies.slice(0, 5).map(c => ({
        cui: c.cui,
        name: c.name,
        marketCap: c.marketCap ? Number(c.marketCap) : null,
      })),
      lastFive: companies.slice(-5).map(c => ({
        cui: c.cui,
        name: c.name,
        marketCap: c.marketCap ? Number(c.marketCap) : null,
      })),
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[test-market-query] Error:", error);
    
    return NextResponse.json({
      ok: false,
      error: errorMsg,
    }, { status: 500 });
  }
}
