/**
 * PROMPT 57: Universe statistics API
 */

import { NextResponse } from "next/server";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { prisma } from "@/src/lib/db";
import type { UniverseStats } from "@/src/lib/universe/types";

// Helper to query with fallback if column doesn't exist
async function countWithFallback(
  queryFn: () => Promise<number>,
  fallbackQueryFn?: () => Promise<number>,
  rawSqlFallback?: string
): Promise<number> {
  try {
    return await queryFn();
  } catch (error: any) {
    if (error?.code === "P2022") {
      // Column doesn't exist, try fallback
      console.warn("[universe/stats] Column not found, using fallback");
      
      if (rawSqlFallback) {
        try {
          const result = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(rawSqlFallback);
          return Number(result[0]?.count || 0);
        } catch (sqlError) {
          console.warn("[universe/stats] Raw SQL fallback failed:", sqlError);
        }
      }
      
      if (fallbackQueryFn) {
        return await fallbackQueryFn();
      }
      
      return 0; // Default fallback
    }
    throw error;
  }
}

export async function GET() {
  try {
    const session = await requireAdminSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Base query for total
    const total = await prisma.company.count({ where: { isPublic: true } });

    // Query with fallbacks for columns that might not exist
    const [
      activeScored,
      skeleton,
      seap,
      euFunds,
      anaf,
      user,
      thirdParty,
    ] = await Promise.all([
      // activeScored: companies with romcAiScore, not skeleton
      countWithFallback(
        () => prisma.company.count({ 
          where: { isPublic: true, romcAiScore: { not: null }, isSkeleton: false as any } 
        }),
        () => prisma.company.count({ 
          where: { isPublic: true, romcAiScore: { not: null } } 
        }),
        `SELECT COUNT(*) FROM companies WHERE is_public = true AND romc_ai_score IS NOT NULL AND (is_skeleton = false OR is_skeleton IS NULL)`
      ),
      // skeleton: companies that are skeletons
      countWithFallback(
        () => prisma.company.count({ 
          where: { isPublic: true, isSkeleton: true as any } 
        }),
        () => 0,
        `SELECT COUNT(*) FROM companies WHERE is_public = true AND is_skeleton = true`
      ),
      // Source breakdowns - try with universeSource, fallback to 0 if column doesn't exist
      countWithFallback(
        () => prisma.company.count({ where: { isPublic: true, universeSource: "SEAP" as any } }),
        () => 0,
        `SELECT COUNT(*) FROM companies WHERE is_public = true AND universe_source = 'SEAP'`
      ),
      countWithFallback(
        () => prisma.company.count({ where: { isPublic: true, universeSource: "EU_FUNDS" as any } }),
        () => 0,
        `SELECT COUNT(*) FROM companies WHERE is_public = true AND universe_source = 'EU_FUNDS'`
      ),
      countWithFallback(
        () => prisma.company.count({ where: { isPublic: true, universeSource: "ANAF" as any } }),
        () => 0,
        `SELECT COUNT(*) FROM companies WHERE is_public = true AND universe_source = 'ANAF'`
      ),
      countWithFallback(
        () => prisma.company.count({ where: { isPublic: true, universeSource: "USER" as any } }),
        () => 0,
        `SELECT COUNT(*) FROM companies WHERE is_public = true AND universe_source = 'USER'`
      ),
      countWithFallback(
        () => prisma.company.count({ where: { isPublic: true, universeSource: "THIRD_PARTY" as any } }),
        () => 0,
        `SELECT COUNT(*) FROM companies WHERE is_public = true AND universe_source = 'THIRD_PARTY'`
      ),
    ]);

    const stats: UniverseStats = {
      total,
      activeScored,
      skeleton,
      sourcesBreakdown: {
        SEAP: seap,
        EU_FUNDS: euFunds,
        ANAF: anaf,
        USER: user,
        THIRD_PARTY: thirdParty,
      },
    };

    return NextResponse.json({ ok: true, stats });
  } catch (error) {
    console.error("[universe/stats] Error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

