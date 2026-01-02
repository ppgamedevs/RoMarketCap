/**
 * Boost confidence for all BVB listed companies
 */

import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import * as Sentry from "@sentry/nextjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return POST(req);
}

export async function POST(req: Request) {
  try {
    // Boost confidence for all BVB listed companies
    const result = await prisma.company.updateMany({
      where: {
        isListed: true,
        stockExchange: "BVB",
        dataConfidence: { lt: 70 },
      },
      data: {
        dataConfidence: 70,
      },
    });

    return NextResponse.json({
      ok: true,
      message: `Boosted confidence for ${result.count} BVB companies to 70%`,
      count: result.count,
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[boost-bvb-companies-confidence] Error:", error);
    Sentry.captureException(error);
    
    return NextResponse.json({
      ok: false,
      error: errorMsg,
    }, { status: 500 });
  }
}
