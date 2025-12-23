import { prisma } from "@/src/lib/db";
import { kv } from "@vercel/kv";
import { cache } from "react";

/**
 * Get data freshness aggregates (cached for 10 minutes).
 */
export const getFreshnessAggregates = cache(async () => {
  const cacheKey = "freshness:aggregates";
  const cached = await kv.get<string>(cacheKey).catch(() => null);
  if (cached) {
    try {
      return JSON.parse(cached) as {
        scoredWithin7d: number;
        scoredWithin30d: number;
        enrichedWithin30d: number;
        totalCompanies: number;
      };
    } catch {
      // Invalid cache, continue
    }
  }

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [totalCompanies, scoredWithin7d, scoredWithin30d, enrichedWithin30d] = await Promise.all([
    prisma.company.count({ where: { isPublic: true, visibilityStatus: "PUBLIC" } }),
    prisma.company.count({
      where: {
        isPublic: true,
        visibilityStatus: "PUBLIC",
        lastScoredAt: { gte: sevenDaysAgo },
      },
    }),
    prisma.company.count({
      where: {
        isPublic: true,
        visibilityStatus: "PUBLIC",
        lastScoredAt: { gte: thirtyDaysAgo },
      },
    }),
    prisma.company.count({
      where: {
        isPublic: true,
        visibilityStatus: "PUBLIC",
        lastEnrichedAt: { gte: thirtyDaysAgo },
      },
    }),
  ]);

  const result = {
    scoredWithin7d,
    scoredWithin30d,
    enrichedWithin30d,
    totalCompanies,
  };

  // Cache for 10 minutes
  await kv.set(cacheKey, JSON.stringify(result), { ex: 600 }).catch(() => {});

  return result;
});

