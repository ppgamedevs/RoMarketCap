/**
 * Add scoring-related columns to companies table
 */

import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return POST();
}

export async function POST() {
  try {
    const session = await requireAdminSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const results: string[] = [];

    // 1. Add previous_romc_ai_score column
    try {
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          ALTER TABLE companies
          ADD COLUMN IF NOT EXISTS previous_romc_ai_score INTEGER;
        EXCEPTION
          WHEN duplicate_column THEN null;
        END $$;
      `);
      results.push("✓ Added previous_romc_ai_score column");
    } catch (error: any) {
      if (error?.message?.includes("already exists") || error?.code === "42701") {
        results.push("✓ previous_romc_ai_score column already exists");
      } else {
        throw error;
      }
    }

    // 2. Add romc_ai_score_delta column
    try {
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          ALTER TABLE companies
          ADD COLUMN IF NOT EXISTS romc_ai_score_delta DOUBLE PRECISION;
        EXCEPTION
          WHEN duplicate_column THEN null;
        END $$;
      `);
      results.push("✓ Added romc_ai_score_delta column");
    } catch (error: any) {
      if (error?.message?.includes("already exists") || error?.code === "42701") {
        results.push("✓ romc_ai_score_delta column already exists");
      } else {
        throw error;
      }
    }

    // 3. Verify the columns exist
    const columnCheck = await prisma.$queryRawUnsafe<Array<{
      column_name: string;
      data_type: string;
    }>>(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'companies' 
        AND column_name IN ('previous_romc_ai_score', 'romc_ai_score_delta')
      ORDER BY column_name
    `);

    if (columnCheck.length > 0) {
      results.push(`✓ Verified: ${columnCheck.length} columns exist`);
      columnCheck.forEach(col => {
        results.push(`  - ${col.column_name} (${col.data_type})`);
      });
    } else {
      results.push("⚠ Warning: No columns found after creation");
    }

    return NextResponse.json({
      ok: true,
      message: "Scoring columns added successfully",
      results,
    });
  } catch (error) {
    console.error("[admin/add-scoring-columns] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

