/**
 * Cleanup Wrong Founding Dates
 * 
 * Removes foundedAt for companies that have unreliable dates (2020+),
 * which are likely createdAt_estimated rather than real founding dates.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return POST(req);
}

export async function POST(req: NextRequest) {
  try {
    await requireAdminSession();

    const url = new URL(req.url);
    const dryRun = url.searchParams.get("dryRun") === "true";
    const yearThreshold = parseInt(url.searchParams.get("yearThreshold") || "2020");

    // Find companies with foundedAt >= 2020 (likely createdAt_estimated)
    // But keep them if they also have foundedYear < 2020 (real data)
    const companiesToClean = await prisma.company.findMany({
      where: {
        foundedAt: {
          gte: new Date(yearThreshold, 0, 1), // >= 2020-01-01
        },
        // Exclude companies that have a real foundedYear < 2020
        OR: [
          { foundedYear: null },
          { foundedYear: { gte: yearThreshold } }, // foundedYear is also >= 2020
        ],
      },
      select: {
        id: true,
        name: true,
        foundedAt: true,
        foundedYear: true,
      },
    });

    if (companiesToClean.length === 0) {
      return NextResponse.json({
        ok: true,
        message: "No companies to clean",
        dryRun,
        processed: 0,
        updated: 0,
      });
    }

    let updated = 0;
    const updates: Array<{ id: string; name: string; foundedAt: string; foundedYear: number | null }> = [];

    for (const company of companiesToClean) {
      updates.push({
        id: company.id,
        name: company.name,
        foundedAt: company.foundedAt?.toISOString() || "",
        foundedYear: company.foundedYear,
      });

      if (!dryRun) {
        await prisma.company.update({
          where: { id: company.id },
          data: { foundedAt: null },
        });
        updated++;
      }
    }

    return NextResponse.json({
      ok: true,
      message: dryRun ? "Dry run - no changes made" : `Cleaned ${updated} companies with unreliable founding dates`,
      dryRun,
      yearThreshold,
      processed: companiesToClean.length,
      updated,
      sample: updates.slice(0, 20),
    });
  } catch (error) {
    console.error("[admin/cleanup-wrong-founding-dates] Error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
