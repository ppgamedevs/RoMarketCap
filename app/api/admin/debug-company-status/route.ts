/**
 * Debug endpoint to see status of specific companies
 */

import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Check specific companies we know have revenue
    const testCuis = [
      "15991456", // Kaufland
      "15859559", // Lidl  
      "13093222", // Engie
      "11588780", // Carrefour
      "18025825", // E.ON
      "14399840", // eMAG
      "9010105",  // Orange
      "11951598", // Vodafone
    ];

    const companies = await prisma.company.findMany({
      where: {
        cui: { in: testCuis },
      },
      select: {
        cui: true,
        name: true,
        revenueLatest: true,
        employees: true,
        marketCap: true,
        industry: true,
        isPublic: true,
        isSkeleton: true,
        isListed: true,
        dataConfidence: true,
      },
    });

    return NextResponse.json({
      ok: true,
      total: companies.length,
      companies: companies.map(c => ({
        cui: c.cui,
        name: c.name,
        revenue: c.revenueLatest ? `${Number(c.revenueLatest).toLocaleString()} RON` : "NULL",
        employees: c.employees || "NULL",
        marketCap: c.marketCap ? `${Number(c.marketCap).toLocaleString()} RON` : "NULL",
        industry: c.industry || "NULL",
        isPublic: c.isPublic,
        isSkeleton: c.isSkeleton,
        isListed: c.isListed,
        confidence: c.dataConfidence,
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
