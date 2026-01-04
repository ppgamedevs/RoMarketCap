/**
 * Admin endpoint to test score snapshot creation
 * 
 * Creates snapshots for a small batch of companies without lock
 * Useful for debugging why snapshots aren't being created
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { prisma } from "@/src/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdminSession();

    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "5");

    // Get today's date (normalized to midnight UTC)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Find a few public companies with scores
    const companies = await prisma.company.findMany({
      where: {
        isPublic: true,
        visibilityStatus: "PUBLIC",
        romcScore: { not: null },
        isSkeleton: false,
      },
      select: {
        id: true,
        name: true,
        romcScore: true,
        romcConfidence: true,
        valuationRangeLow: true,
        valuationRangeHigh: true,
        revenueLatest: true,
        profitLatest: true,
        employees: true,
      },
      take: limit,
      orderBy: { id: 'asc' },
    });

    console.log(`[test-score-snapshots] Found ${companies.length} companies to snapshot`);

    if (companies.length === 0) {
      return NextResponse.json({
        ok: true,
        message: "No companies found to snapshot",
        companies: [],
        snapshotsCreated: 0,
      });
    }

    // Create CompanyScoreHistory records
    const snapshotData = companies.map(company => ({
      companyId: company.id,
      recordedAt: today,
      romcScore: company.romcScore || 0,
      romcConfidence: company.romcConfidence || 50,
      valuationRangeLow: company.valuationRangeLow ? Number(company.valuationRangeLow) : null,
      valuationRangeHigh: company.valuationRangeHigh ? Number(company.valuationRangeHigh) : null,
      employees: company.employees,
      revenueLatest: company.revenueLatest ? Number(company.revenueLatest) : null,
      profitLatest: company.profitLatest ? Number(company.profitLatest) : null,
      source: 'cron' as const,
    }));

    let snapshotted = 0;
    let errors: Array<{ company: string; error: string }> = [];

    // Try to create snapshots one by one to see which ones fail
    for (let i = 0; i < snapshotData.length; i++) {
      const data = snapshotData[i]!;
      const company = companies[i]!;
      
      try {
        const result = await prisma.companyScoreHistory.create({
          data,
        });
        snapshotted++;
        console.log(`[test-score-snapshots] ✅ Created snapshot for ${company.name} (${company.id})`);
      } catch (error: any) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        errors.push({
          company: company.name,
          error: errorMsg,
        });
        console.error(`[test-score-snapshots] ❌ Error creating snapshot for ${company.name}:`, error);
      }
    }

    // Check if snapshots were actually created
    const createdSnapshots = await prisma.companyScoreHistory.findMany({
      where: {
        companyId: { in: companies.map(c => c.id) },
        recordedAt: { gte: today },
      },
      select: {
        id: true,
        companyId: true,
        recordedAt: true,
        romcScore: true,
      },
    });

    return NextResponse.json({
      ok: true,
      message: `Created ${snapshotted} snapshots out of ${companies.length} companies`,
      companies: companies.map(c => ({
        id: c.id,
        name: c.name,
        romcScore: c.romcScore,
      })),
      snapshotsCreated: snapshotted,
      errors,
      verifiedSnapshots: createdSnapshots.map(s => ({
        id: s.id,
        companyId: s.companyId,
        recordedAt: s.recordedAt.toISOString(),
        romcScore: s.romcScore,
      })),
    });
  } catch (error) {
    console.error("[admin/test-score-snapshots] Error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
