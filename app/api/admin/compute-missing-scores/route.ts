/**
 * Compute ScoreSnapshot (romc_v0) for companies that don't have scores yet
 * 
 * This is needed for companies imported via national ingestion to appear on homepage
 */

import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { computeScoreForCompany } from "@/src/lib/scoring/computeScoreForCompany";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await requireAdminSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const limit = typeof body.limit === "number" ? Math.min(body.limit, 1000) : 200;
    const batchSize = 50;

    // Find companies without ScoreSnapshot (romc_v0)
    const companiesWithoutScores = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT c.id
      FROM companies c
      WHERE c.is_public = true
        AND c.visibility_status = 'PUBLIC'
        AND NOT EXISTS (
          SELECT 1
          FROM score_snapshot ss
          WHERE ss.company_id = c.id
            AND ss.version = 'romc_v0'
        )
      ORDER BY c.created_at DESC
      LIMIT ${limit}
    `;

    if (companiesWithoutScores.length === 0) {
      return NextResponse.json({
        ok: true,
        message: "All companies already have scores",
        processed: 0,
        updated: 0,
      });
    }

    let processed = 0;
    let updated = 0;
    const errors: string[] = [];

    // Process in batches
    for (let i = 0; i < companiesWithoutScores.length; i += batchSize) {
      const batch = companiesWithoutScores.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (company) => {
          try {
            processed++;
            const result = await computeScoreForCompany(company.id);
            if (result) {
              updated++;
            }
          } catch (error) {
            errors.push(`${company.id}: ${error instanceof Error ? error.message : String(error)}`);
          }
        })
      );
    }

    return NextResponse.json({
      ok: true,
      message: `Processed ${processed} companies, created ${updated} score snapshots`,
      processed,
      updated,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined, // Limit errors to first 10
    });
  } catch (error) {
    console.error("[admin/compute-missing-scores] Error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

