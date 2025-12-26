/**
 * PROMPT 57: Universe statistics API
 */

import { NextResponse } from "next/server";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { prisma } from "@/src/lib/db";
import type { UniverseStats } from "@/src/lib/universe/types";

export async function GET() {
  try {
    const session = await requireAdminSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const [
      total,
      activeScored,
      skeleton,
      seap,
      euFunds,
      anaf,
      user,
      thirdParty,
    ] = await Promise.all([
      prisma.company.count({ where: { isPublic: true } }),
      prisma.company.count({ where: { isPublic: true, romcAiScore: { not: null }, isSkeleton: false } }),
      prisma.company.count({ where: { isPublic: true, isSkeleton: true } }),
      prisma.company.count({ where: { isPublic: true, universeSource: "SEAP" } }),
      prisma.company.count({ where: { isPublic: true, universeSource: "EU_FUNDS" } }),
      prisma.company.count({ where: { isPublic: true, universeSource: "ANAF" } }),
      prisma.company.count({ where: { isPublic: true, universeSource: "USER" } }),
      prisma.company.count({ where: { isPublic: true, universeSource: "THIRD_PARTY" } }),
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
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

