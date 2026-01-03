/**
 * Check Company Ages Status
 * 
 * Diagnostic endpoint to see how many companies have foundedAt, foundedYear, or neither.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdminSession();

    // Count companies by foundedAt/foundedYear status
    const [
      totalCompanies,
      withFoundedAt,
      withFoundedYear,
      withBoth,
      withNeither,
      withFoundedYearButNoFoundedAt,
    ] = await Promise.all([
      prisma.company.count(),
      prisma.company.count({ where: { foundedAt: { not: null } } }),
      prisma.company.count({ where: { foundedYear: { not: null } } }),
      prisma.company.count({ where: { foundedAt: { not: null }, foundedYear: { not: null } } }),
      prisma.company.count({ where: { foundedAt: null, foundedYear: null } }),
      prisma.company.count({ where: { foundedAt: null, foundedYear: { not: null } } }),
    ]);

    // Sample companies that need updating
    const sampleNeedsUpdate = await prisma.company.findMany({
      where: {
        foundedAt: null,
        foundedYear: { not: null },
      },
      select: {
        id: true,
        name: true,
        foundedYear: true,
        foundedAt: true,
      },
      take: 10,
    });

    // Sample companies with foundedAt to verify age calculation
    const sampleWithAge = await prisma.company.findMany({
      where: {
        foundedAt: { not: null },
      },
      select: {
        id: true,
        name: true,
        foundedAt: true,
        foundedYear: true,
      },
      take: 10,
    });

    const now = new Date();
    const msPerYear = 365.25 * 24 * 60 * 60 * 1000;
    const sampleAges = sampleWithAge.map((c) => {
      if (!c.foundedAt) return null;
      const age = Math.floor((now.getTime() - c.foundedAt.getTime()) / msPerYear);
      return { name: c.name, foundedAt: c.foundedAt.toISOString(), age };
    });

    return NextResponse.json({
      ok: true,
      summary: {
        totalCompanies,
        withFoundedAt,
        withFoundedYear,
        withBoth,
        withNeither,
        withFoundedYearButNoFoundedAt, // These can be updated
      },
      sampleNeedsUpdate,
      sampleWithAge: sampleAges.filter((a) => a !== null),
    });
  } catch (error) {
    console.error("[admin/check-company-ages] Error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
