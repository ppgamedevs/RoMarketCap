/**
 * Admin endpoint to test the market API response
 * 
 * Tests if 24h change and sparkline data are returned correctly
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { prisma } from "@/src/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdminSession();

    // Get a few companies
    const companies = await prisma.company.findMany({
      where: {
        isPublic: true,
        visibilityStatus: "PUBLIC",
        romcScore: { not: null },
        isSkeleton: false,
      },
      take: 5,
      select: {
        id: true,
        name: true,
        romcScore: true,
      },
      orderBy: { id: 'asc' },
    });

    const companyIds = companies.map((c) => c.id);

    // Fetch sparkline data (last 7 days) - same as market API
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const scoreHistory = await prisma.companyScoreHistory.findMany({
      where: {
        companyId: { in: companyIds },
        recordedAt: { gte: sevenDaysAgo },
      },
      orderBy: { recordedAt: "asc" },
      select: {
        companyId: true,
        recordedAt: true,
        romcScore: true,
      },
    });

    // Group by company
    const historyByCompany = new Map<string, Array<{ date: string; score: number }>>();
    for (const record of scoreHistory) {
      if (!historyByCompany.has(record.companyId)) {
        historyByCompany.set(record.companyId, []);
      }
      historyByCompany.get(record.companyId)!.push({
        date: record.recordedAt.toISOString().split("T")[0],
        score: Number(record.romcScore),
      });
    }

    // Fetch 24h ago scores - same as market API
    const nowFor24h = new Date();
    const yesterday = new Date(nowFor24h);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    yesterday.setUTCHours(0, 0, 0, 0);
    
    const thirtyHoursAgo = new Date(nowFor24h.getTime() - 30 * 60 * 60 * 1000);
    
    const yesterdayScores = await prisma.companyScoreHistory.findMany({
      where: {
        companyId: { in: companyIds },
        recordedAt: {
          gte: thirtyHoursAgo,
          lt: nowFor24h,
        },
      },
      select: {
        companyId: true,
        recordedAt: true,
        romcScore: true,
      },
      orderBy: { recordedAt: "desc" },
    });

    // Group yesterday scores by company
    const yesterdayScoreByCompany = new Map<string, number>();
    const yesterdayMidnight = new Date(yesterday);
    
    // First pass: prefer exact yesterday snapshot
    for (const record of yesterdayScores) {
      const recordDate = new Date(record.recordedAt);
      recordDate.setUTCHours(0, 0, 0, 0);
      
      if (recordDate.getTime() === yesterdayMidnight.getTime()) {
        if (!yesterdayScoreByCompany.has(record.companyId)) {
          yesterdayScoreByCompany.set(record.companyId, Number(record.romcScore));
        }
      }
    }
    
    // Second pass: fill in missing companies with most recent snapshot
    for (const record of yesterdayScores) {
      if (!yesterdayScoreByCompany.has(record.companyId)) {
        yesterdayScoreByCompany.set(record.companyId, Number(record.romcScore));
      }
    }

    // Build test results
    const results = companies.map(company => {
      const sparkline = historyByCompany.get(company.id) || [];
      const yesterdayScore = yesterdayScoreByCompany.get(company.id);
      const currentScore = company.romcScore;
      
      let score24hChangePercent: number | null = null;
      if (currentScore !== null && yesterdayScore !== undefined && yesterdayScore !== 0) {
        score24hChangePercent = ((currentScore - yesterdayScore) / yesterdayScore) * 100;
      }

      // Calculate 7-day trend
      let sparklineTrend: "up" | "down" | "neutral" = "neutral";
      if (sparkline.length >= 2) {
        const first = sparkline[0]!.score;
        const last = sparkline[sparkline.length - 1]!.score;
        if (last > first) sparklineTrend = "up";
        else if (last < first) sparklineTrend = "down";
      }

      return {
        companyId: company.id,
        companyName: company.name,
        currentScore,
        yesterdayScore: yesterdayScore ?? null,
        score24hChangePercent,
        sparklineData: sparkline,
        sparklineTrend,
        sparklineCount: sparkline.length,
        has24hData: yesterdayScore !== undefined,
        has7dData: sparkline.length > 0,
      };
    });

    return NextResponse.json({
      ok: true,
      summary: {
        companiesChecked: companies.length,
        companiesWith24hData: results.filter(r => r.has24hData).length,
        companiesWith7dData: results.filter(r => r.has7dData).length,
        companiesWith24hChange: results.filter(r => r.score24hChangePercent !== null).length,
      },
      dateRanges: {
        now: nowFor24h.toISOString(),
        yesterday: yesterday.toISOString(),
        yesterdayMidnight: yesterdayMidnight.toISOString(),
        thirtyHoursAgo: thirtyHoursAgo.toISOString(),
        sevenDaysAgo: sevenDaysAgo.toISOString(),
      },
      results,
      rawData: {
        scoreHistoryCount: scoreHistory.length,
        yesterdayScoresCount: yesterdayScores.length,
        scoreHistory: scoreHistory.map(s => ({
          companyId: s.companyId,
          recordedAt: s.recordedAt.toISOString(),
          romcScore: Number(s.romcScore),
        })),
        yesterdayScores: yesterdayScores.map(s => ({
          companyId: s.companyId,
          recordedAt: s.recordedAt.toISOString(),
          romcScore: Number(s.romcScore),
        })),
      },
    });
  } catch (error) {
    console.error("[admin/test-market-api] Error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
