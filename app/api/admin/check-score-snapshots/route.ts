/**
 * Diagnostic endpoint to check which companies have ScoreSnapshot vs CompanyScoreSnapshot
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

    // Count companies with ScoreSnapshot (romc_v0)
    const withScoreSnapshot = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(DISTINCT ss.company_id) as count
      FROM score_snapshot ss
      WHERE ss.version = 'romc_v0'
        AND EXISTS (
          SELECT 1 FROM companies c
          WHERE c.id = ss.company_id
            AND c.is_public = true
            AND c.visibility_status = 'PUBLIC'
            AND c.is_skeleton = false
            AND c.merged_into_company_id IS NULL
        )
    `;

    // Count companies with CompanyScoreSnapshot
    const withCompanyScoreSnapshot = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(DISTINCT css.company_id) as count
      FROM company_score css
      WHERE EXISTS (
        SELECT 1 FROM companies c
        WHERE c.id = css.company_id
          AND c.is_public = true
          AND c.visibility_status = 'PUBLIC'
          AND c.is_skeleton = false
          AND c.merged_into_company_id IS NULL
      )
    `;

    // Count total public companies
    const totalPublic = await prisma.company.count({
      where: {
        isPublic: true,
        visibilityStatus: "PUBLIC",
        isSkeleton: false,
        mergedIntoCompanyId: null,
      },
    });

    // Count companies without ScoreSnapshot
    const withoutScoreSnapshot = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(DISTINCT c.id) as count
      FROM companies c
      WHERE c.is_public = true
        AND c.visibility_status = 'PUBLIC'
        AND c.is_skeleton = false
        AND c.merged_into_company_id IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM score_snapshot ss
          WHERE ss.company_id = c.id
            AND ss.version = 'romc_v0'
        )
    `;

    return NextResponse.json({
      ok: true,
      stats: {
        totalPublicCompanies: totalPublic,
        withScoreSnapshot: Number(withScoreSnapshot[0]?.count || 0),
        withCompanyScoreSnapshot: Number(withCompanyScoreSnapshot[0]?.count || 0),
        withoutScoreSnapshot: Number(withoutScoreSnapshot[0]?.count || 0),
      },
    });
  } catch (error) {
    console.error("[admin/check-score-snapshots] Error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

