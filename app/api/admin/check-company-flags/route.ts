/**
 * Diagnostic endpoint to check company flags and why they're not appearing
 */

import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireAdminSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Total companies
    const total = await prisma.company.count();

    // Check various flag combinations
    const stats = {
      total,
      isPublic: await prisma.company.count({ where: { isPublic: true } }),
      visibilityPublic: await prisma.company.count({ where: { visibilityStatus: "PUBLIC" } }),
      isPublicAndVisibilityPublic: await prisma.company.count({
        where: { isPublic: true, visibilityStatus: "PUBLIC" },
      }),
      isSkeleton: await prisma.company.count({ where: { isSkeleton: true } }),
      isDemo: await prisma.company.count({ where: { isDemo: true } }),
      hasDataConfidence: await prisma.company.count({
        where: { dataConfidence: { not: null } },
      }),
      dataConfidenceGte40: await prisma.company.count({
        where: { dataConfidence: { gte: 40 } },
      }),
    };

    // Sample companies to see their flags
    const sampleCompanies = await prisma.company.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        cui: true,
        isPublic: true,
        visibilityStatus: true,
        isSkeleton: true,
        isDemo: true,
        dataConfidence: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      stats,
      sampleCompanies,
    });
  } catch (error) {
    console.error("[admin/check-company-flags] Error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

