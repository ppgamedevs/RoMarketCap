/**
 * Admin endpoint to check score snapshot status
 * 
 * Verifies if CompanyScoreHistory records exist and when they were last created
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { prisma } from "@/src/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdminSession();

    // Check total count of score history records
    const totalCount = await prisma.companyScoreHistory.count();

    // Check records from last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const last7DaysCount = await prisma.companyScoreHistory.count({
      where: {
        recordedAt: { gte: sevenDaysAgo },
      },
    });

    // Check records from last 24 hours
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const last24hCount = await prisma.companyScoreHistory.count({
      where: {
        recordedAt: { gte: yesterday },
      },
    });

    // Check today's records
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const todayCount = await prisma.companyScoreHistory.count({
      where: {
        recordedAt: { gte: today },
      },
    });

    // Get most recent snapshot
    const mostRecent = await prisma.companyScoreHistory.findFirst({
      orderBy: { recordedAt: "desc" },
      select: {
        recordedAt: true,
        companyId: true,
        romcScore: true,
      },
    });

    // Get sample of companies with snapshots
    const companiesWithSnapshots = await prisma.company.findMany({
      where: {
        isPublic: true,
        visibilityStatus: "PUBLIC",
        romcScore: { not: null },
        isSkeleton: false,
      },
      take: 10,
      select: {
        id: true,
        name: true,
        romcScore: true,
      },
    });

    // Check how many of these companies have snapshots
    const companyIds = companiesWithSnapshots.map(c => c.id);
    const snapshotsForSample = await prisma.companyScoreHistory.findMany({
      where: {
        companyId: { in: companyIds },
        recordedAt: { gte: sevenDaysAgo },
      },
      select: {
        companyId: true,
        recordedAt: true,
        romcScore: true,
      },
      orderBy: { recordedAt: "desc" },
    });

    // Group by company
    const snapshotsByCompany = new Map<string, Array<{ date: string; score: number }>>();
    for (const snapshot of snapshotsForSample) {
      if (!snapshotsByCompany.has(snapshot.companyId)) {
        snapshotsByCompany.set(snapshot.companyId, []);
      }
      snapshotsByCompany.get(snapshot.companyId)!.push({
        date: snapshot.recordedAt.toISOString().split("T")[0],
        score: Number(snapshot.romcScore),
      });
    }

    // Check distribution by date
    const dateDistribution = await prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
      SELECT DATE(recorded_at) as date, COUNT(*) as count
      FROM company_score_history
      WHERE recorded_at >= ${sevenDaysAgo}
      GROUP BY DATE(recorded_at)
      ORDER BY date DESC
      LIMIT 10
    `;

    return NextResponse.json({
      ok: true,
      summary: {
        totalSnapshots: totalCount,
        last7Days: last7DaysCount,
        last24h: last24hCount,
        today: todayCount,
        mostRecent: mostRecent ? {
          recordedAt: mostRecent.recordedAt.toISOString(),
          companyId: mostRecent.companyId,
          score: Number(mostRecent.romcScore),
        } : null,
      },
      sample: {
        companiesChecked: companiesWithSnapshots.length,
        companiesWithSnapshots: Array.from(snapshotsByCompany.keys()).length,
        snapshots: Array.from(snapshotsByCompany.entries()).map(([companyId, snapshots]) => {
          const company = companiesWithSnapshots.find(c => c.id === companyId);
          return {
            companyId,
            companyName: company?.name || "Unknown",
            currentScore: company?.romcScore || null,
            snapshotCount: snapshots.length,
            snapshots: snapshots.slice(0, 7), // Last 7 days
          };
        }),
      },
      dateDistribution: dateDistribution.map(d => ({
        date: d.date,
        count: Number(d.count),
      })),
    });
  } catch (error) {
    console.error("[admin/check-score-snapshots] Error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
