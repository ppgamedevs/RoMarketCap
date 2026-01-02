/**
 * Boost data confidence for major companies with revenue data
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
    // Update companies with revenue > 1B RON to have at least 60% confidence
    // These are major companies and should be visible
    const updated = await prisma.company.updateMany({
      where: {
        revenueLatest: { gt: 1000000000 }, // > 1B RON
        dataConfidence: { lt: 60 }, // Currently low confidence
      },
      data: {
        dataConfidence: 70, // Boost to 70% for major revenue companies
      },
    });

    return NextResponse.json({
      ok: true,
      message: `Boosted confidence for ${updated.count} major companies to 70%`,
      count: updated.count,
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({
      ok: false,
      error: errorMsg,
    }, { status: 500 });
  }
}
