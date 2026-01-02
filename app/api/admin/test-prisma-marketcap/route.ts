/**
 * Test Prisma query directly for SIF companies with marketCap
 */

import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { buildRankingGuard } from "@/src/lib/ranking/rankingGuard";
import { isLaunchMode } from "@/src/lib/launch/mode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const launchMode = isLaunchMode();
    const guard = buildRankingGuard(launchMode, { minDataConfidence: 0 });

    // Build orderBy for marketCap sort
    const orderBy = [
      { marketCap: "desc" },
      { valuationRangeHigh: "desc" },
      { romcAiScore: "desc" },
      { cui: "asc" }
    ];

    // Fetch first 10 companies
    const companies = await prisma.company.findMany({
      where: guard.where,
      orderBy,
      take: 10,
      select: {
        cui: true,
        name: true,
        marketCap: true,
        romcAiScore: true,
        isListed: true,
        stockSymbol: true,
      },
    });

    // Also fetch SIF companies specifically
    const sifCompanies = await prisma.company.findMany({
      where: {
        ...guard.where,
        OR: [
          { name: { contains: "SIF", mode: "insensitive" } },
          { stockSymbol: { in: ["SIF1", "SIF2", "SIF3", "SIF4", "SIF5", "ALW", "NRF", "2P", "SAFE"] } },
        ],
      },
      select: {
        cui: true,
        name: true,
        marketCap: true,
        romcAiScore: true,
        isListed: true,
        stockSymbol: true,
      },
    });

    return NextResponse.json({
      ok: true,
      firstTen: companies.map(c => ({
        cui: c.cui,
        name: c.name,
        marketCap: c.marketCap ? Number(c.marketCap) : null,
        marketCapRaw: c.marketCap,
        romcAiScore: c.romcAiScore,
        isListed: c.isListed,
        stockSymbol: c.stockSymbol,
      })),
      sifCompanies: sifCompanies.map(c => ({
        cui: c.cui,
        name: c.name,
        marketCap: c.marketCap ? Number(c.marketCap) : null,
        marketCapRaw: c.marketCap,
        romcAiScore: c.romcAiScore,
        isListed: c.isListed,
        stockSymbol: c.stockSymbol,
      })),
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[test-prisma-marketcap] Error:", error);
    
    return NextResponse.json({
      ok: false,
      error: errorMsg,
    }, { status: 500 });
  }
}
