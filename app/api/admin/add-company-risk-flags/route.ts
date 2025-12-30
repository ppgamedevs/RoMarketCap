/**
 * Add company_risk_flags column and CompanyRiskFlag enum to database
 */

import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const session = await requireAdminSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const results: string[] = [];

    // 1. Create CompanyRiskFlag enum if it doesn't exist
    try {
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          CREATE TYPE "CompanyRiskFlag" AS ENUM (
            'SUBMISSION_SPIKE',
            'COORDINATED_CLAIMS',
            'ENRICHMENT_FAILURES',
            'ABNORMAL_OSCILLATIONS',
            'SUSPICIOUS_ACTIVITY'
          );
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);
      results.push("✓ Created CompanyRiskFlag enum");
    } catch (error: any) {
      if (error?.message?.includes("already exists") || error?.code === "42P07") {
        results.push("✓ CompanyRiskFlag enum already exists");
      } else {
        throw error;
      }
    }

    // 2. Add company_risk_flags column if it doesn't exist
    try {
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          ALTER TABLE companies
          ADD COLUMN IF NOT EXISTS company_risk_flags "CompanyRiskFlag"[] DEFAULT ARRAY[]::"CompanyRiskFlag"[];
        EXCEPTION
          WHEN duplicate_column THEN null;
        END $$;
      `);
      results.push("✓ Added company_risk_flags column");
    } catch (error: any) {
      if (error?.message?.includes("already exists") || error?.code === "42701") {
        results.push("✓ company_risk_flags column already exists");
      } else {
        throw error;
      }
    }

    // 3. Verify the column exists
    const columnCheck = await prisma.$queryRawUnsafe<Array<{
      column_name: string;
      data_type: string;
      udt_name: string;
    }>>(`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_name = 'companies' AND column_name = 'company_risk_flags'
    `);

    if (columnCheck.length > 0) {
      results.push(`✓ Verified: column exists (type: ${columnCheck[0]?.udt_name})`);
    } else {
      results.push("⚠ Warning: Column not found after creation");
    }

    return NextResponse.json({
      ok: true,
      message: "Company risk flags column added successfully",
      results,
    });
  } catch (error) {
    console.error("[admin/add-company-risk-flags] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

