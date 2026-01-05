/**
 * Boost data confidence for major and medium companies with revenue data
 * These are well-known companies that deserve high confidence
 */

import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return POST();
}

export async function POST() {
  try {
    // Update companies with revenue > 1B RON to have at least 70% confidence
    // These are major companies and should be visible
    const majorUpdated = await prisma.company.updateMany({
      where: {
        revenueLatest: { gt: 1000000000 }, // > 1B RON
        dataConfidence: { lt: 70 }, // Currently lower than 70%
      },
      data: {
        dataConfidence: 70, // Boost to 70% for major revenue companies
      },
    });

    // Update medium companies with revenue > 1M RON to have at least 70% confidence
    // These are medium companies with significant revenue
    const mediumUpdated = await prisma.company.updateMany({
      where: {
        revenueLatest: { 
          gt: 1000000, // > 1M RON
          lte: 1000000000, // <= 1B RON (medium range)
        },
        dataConfidence: { lt: 70 }, // Currently lower than 70%
      },
      data: {
        dataConfidence: 70, // Boost to 70% for medium revenue companies
      },
    });

    const totalUpdated = majorUpdated.count + mediumUpdated.count;

    return NextResponse.json({
      ok: true,
      message: `Boosted confidence for ${totalUpdated} companies (${majorUpdated.count} major, ${mediumUpdated.count} medium) to 70%`,
      majorCount: majorUpdated.count,
      mediumCount: mediumUpdated.count,
      totalCount: totalUpdated,
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({
      ok: false,
      error: errorMsg,
    }, { status: 500 });
  }
}
