/**
 * PROMPT 62: Market View API
 * 
 * Returns ranked companies for the market view page (CoinMarketCap-style)
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/src/lib/db";
import { buildRankingGuard } from "@/src/lib/ranking/rankingGuard";
import { isLaunchMode } from "@/src/lib/launch/mode";
import { kv } from "@vercel/kv";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(200).optional().default(50),
  search: z.string().optional(),
  industry: z.string().optional(),
  county: z.string().optional(),
  confidence: z.enum(["high", "medium", "low"]).optional(),
  integrity: z.coerce.boolean().optional(),
  verified: z.coerce.boolean().optional(),
  fresh: z.coerce.boolean().optional(),
  sort: z.enum(["romcAiScore", "romcScore", "marketCap", "confidence"]).optional().default("romcAiScore"),
});

const CACHE_TTL = 60; // 60 seconds
const FREE_LIMIT = 50; // Free users see top 50

type MarketRow = {
  rank: number;
  companyId: string;
  slug: string;
  name: string;
  legalName: string | null;
  cui: string;
  romcScore: number | null;
  romcAiScore: number | null;
  dataConfidence: number | null;
  integrityScore: number | null;
  valuationRangeLow: number | null;
  valuationRangeHigh: number | null;
  industrySlug: string | null;
  countySlug: string | null;
  lastScoredAt: Date | null;
  sparklineData: Array<{ date: string; score: number }>; // Last 7 days
  rankDelta: number | null; // 24h position change
};

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const isPremium = session?.user?.isPremium ?? false;
    const isAdmin = session?.user?.role === "admin";

    // Parse query params
    const url = new URL(req.url);
    const parsed = QuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
    
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid query parameters", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { page, pageSize, search, industry, county, confidence, integrity, verified, fresh, sort } = parsed.data;

    // Build cache key
    const cacheKey = `market:${JSON.stringify({ page, pageSize, search, industry, county, confidence, integrity, verified, fresh, sort, isPremium })}`;

    // Try cache first (skip for admins to see fresh data)
    if (!isAdmin) {
      try {
        const cached = await kv.get<{ rows: MarketRow[]; total: number; rankDeltaMap: Record<string, number> }>(cacheKey);
        if (cached) {
          return NextResponse.json({ ok: true, ...cached, cached: true });
        }
      } catch (cacheError) {
        // Cache miss or error, continue to DB query
      }
    }

    // Build ranking guard
    const launchMode = isLaunchMode();
    const guard = buildRankingGuard(launchMode);

    // Apply filters
    const where = { ...guard.where };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { legalName: { contains: search, mode: "insensitive" } },
        { cui: { contains: search } },
      ];
    }

    if (industry) {
      where.industrySlug = industry;
    }

    if (county) {
      where.countySlug = county;
    }

    if (confidence) {
      const thresholds: Record<typeof confidence, { gte: number; lte?: number }> = {
        high: { gte: 70 },
        medium: { gte: 50, lte: 69 },
        low: { gte: 40, lte: 49 },
      };
      where.dataConfidence = thresholds[confidence];
    }

    if (integrity) {
      where.companyIntegrityScore = { gte: 70 };
    }

    if (verified) {
      where.universeVerified = true;
    }

    if (fresh) {
      // Data updated in last 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      where.lastScoredAt = { gte: sevenDaysAgo };
    }

    // Build orderBy based on sort param
    let orderBy = guard.orderBy;
    if (sort === "romcScore") {
      orderBy = [{ romcScore: "desc" }, { dataConfidence: "desc" as any }, { lastScoredAt: "desc" }, { cui: "asc" }];
    } else if (sort === "marketCap") {
      orderBy = [{ valuationRangeHigh: "desc" }, { romcAiScore: "desc" }, { cui: "asc" }];
    } else if (sort === "confidence") {
      orderBy = [{ dataConfidence: "desc" as any }, { romcAiScore: "desc" }, { lastScoredAt: "desc" }, { cui: "asc" }];
    }
    // Default is romcAiScore (already in guard.orderBy)

    // Calculate skip/limit
    const skip = (page - 1) * pageSize;
    const effectiveLimit = isPremium || isAdmin ? pageSize : Math.min(pageSize, FREE_LIMIT - skip);

    if (effectiveLimit <= 0) {
      return NextResponse.json({
        ok: true,
        rows: [],
        total: 0,
        rankDeltaMap: {},
        page,
        pageSize,
        isPremium,
        freeLimit: FREE_LIMIT,
      });
    }

    // Get total count
    const total = await prisma.company.count({ where });

    // Fetch companies
    const companies = await prisma.company.findMany({
      where,
      orderBy,
      skip,
      take: effectiveLimit,
      select: {
        id: true,
        slug: true,
        name: true,
        legalName: true,
        cui: true,
        romcScore: true,
        romcAiScore: true,
        dataConfidence: true,
        companyIntegrityScore: true,
        valuationRangeLow: true,
        valuationRangeHigh: true,
        industrySlug: true,
        countySlug: true,
        lastScoredAt: true,
      },
    });

    // Fetch sparkline data (last 7 days) for all companies in batch
    const companyIds = companies.map((c) => c.id);
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

    // Calculate rank deltas (compare with yesterday's rank)
    // For now, return null (will be implemented with KV cache of previous day's ranks)
    const rankDeltaMap: Record<string, number> = {};

    // Build rows
    const rows: MarketRow[] = companies.map((company, index) => {
      const globalRank = skip + index + 1;
      const sparkline = historyByCompany.get(company.id) || [];

      return {
        rank: globalRank,
        companyId: company.id,
        slug: company.slug,
        name: company.name,
        legalName: company.legalName,
        cui: company.cui,
        romcScore: company.romcScore,
        romcAiScore: company.romcAiScore,
        dataConfidence: company.dataConfidence,
        integrityScore: company.companyIntegrityScore,
        valuationRangeLow: company.valuationRangeLow ? Number(company.valuationRangeLow) : null,
        valuationRangeHigh: company.valuationRangeHigh ? Number(company.valuationRangeHigh) : null,
        industrySlug: company.industrySlug,
        countySlug: company.countySlug,
        lastScoredAt: company.lastScoredAt,
        sparklineData: sparkline,
        rankDelta: rankDeltaMap[company.id] ?? null,
      };
    });

    const result = {
      ok: true,
      rows,
      total,
      rankDeltaMap,
      page,
      pageSize,
      isPremium,
      freeLimit: FREE_LIMIT,
    };

    // Cache result (skip for admins)
    if (!isAdmin) {
      try {
        await kv.set(cacheKey, result, { ex: CACHE_TTL });
      } catch (cacheError) {
        // Cache write failed, continue
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[market] Error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

