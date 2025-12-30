/**
 * Diagnostic endpoint to check if companies exist in database at all
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

    // Try raw SQL to bypass Prisma schema issues
    const rawCount = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`
      SELECT COUNT(*) as count FROM companies
    `);

    // Try Prisma count
    let prismaCount = 0;
    try {
      prismaCount = await prisma.company.count();
    } catch (error) {
      console.error("[check-db-companies] Prisma count error:", error);
    }

    // Get sample companies using raw SQL
    const sampleRaw = await prisma.$queryRawUnsafe<Array<{
      id: string;
      name: string;
      cui: string | null;
      is_public: boolean | null;
      visibility_status: string | null;
      is_skeleton: boolean | null;
      created_at: Date;
    }>>(`
      SELECT id, name, cui, is_public, visibility_status, is_skeleton, created_at
      FROM companies
      ORDER BY created_at DESC
      LIMIT 10
    `);

    // Check if national ingest jobs exist
    const jobsCount = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`
      SELECT COUNT(*) as count FROM national_ingest_jobs
    `).catch(() => [{ count: BigInt(0) }]);

    const lastJob = await prisma.$queryRawUnsafe<Array<{
      id: string;
      discovered: number;
      upserted: number;
      started_at: Date;
    }>>(`
      SELECT id, discovered, upserted, started_at
      FROM national_ingest_jobs
      ORDER BY started_at DESC
      LIMIT 1
    `).catch(() => []);

    return NextResponse.json({
      ok: true,
      rawCount: Number(rawCount[0]?.count || 0),
      prismaCount,
      sampleCompanies: sampleRaw.map(c => ({
        id: c.id,
        name: c.name,
        cui: c.cui,
        isPublic: c.is_public,
        visibilityStatus: c.visibility_status,
        isSkeleton: c.is_skeleton,
        createdAt: c.created_at,
      })),
      nationalIngestJobs: {
        total: Number(jobsCount[0]?.count || 0),
        lastJob: lastJob[0] ? {
          id: lastJob[0].id,
          discovered: lastJob[0].discovered,
          upserted: lastJob[0].upserted,
          startedAt: lastJob[0].started_at,
        } : null,
      },
    });
  } catch (error) {
    console.error("[admin/check-db-companies] Error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

