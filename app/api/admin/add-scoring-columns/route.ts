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

    // 1. Create ScoreStabilityProfile enum if it doesn't exist
    try {
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          CREATE TYPE "ScoreStabilityProfile" AS ENUM (
            'LOW',
            'MEDIUM',
            'HIGH'
          );
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);
      results.push("✓ Created ScoreStabilityProfile enum");
    } catch (error: any) {
      if (error?.message?.includes("already exists") || error?.code === "42P07") {
        results.push("✓ ScoreStabilityProfile enum already exists");
      } else {
        throw error;
      }
    }

    // 2. Add previous_romc_ai_score column
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

    // 3. Add romc_ai_score_delta column
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

    // 4. Add score_stability_profile column
    try {
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          ALTER TABLE companies
          ADD COLUMN IF NOT EXISTS score_stability_profile "ScoreStabilityProfile";
        EXCEPTION
          WHEN duplicate_column THEN null;
        END $$;
      `);
      results.push("✓ Added score_stability_profile column");
    } catch (error: any) {
      if (error?.message?.includes("already exists") || error?.code === "42701") {
        results.push("✓ score_stability_profile column already exists");
      } else {
        throw error;
      }
    }

    // 5. Add company_integrity_score column
    try {
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          ALTER TABLE companies
          ADD COLUMN IF NOT EXISTS company_integrity_score INTEGER;
        EXCEPTION
          WHEN duplicate_column THEN null;
        END $$;
      `);
      results.push("✓ Added company_integrity_score column");
    } catch (error: any) {
      if (error?.message?.includes("already exists") || error?.code === "42701") {
        results.push("✓ company_integrity_score column already exists");
      } else {
        throw error;
      }
    }

    // 6. Add ANAF verification columns
    try {
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          ALTER TABLE companies
          ADD COLUMN IF NOT EXISTS anaf_verified_at TIMESTAMP(3);
        EXCEPTION
          WHEN duplicate_column THEN null;
        END $$;
      `);
      results.push("✓ Added anaf_verified_at column");
    } catch (error: any) {
      if (error?.message?.includes("already exists") || error?.code === "42701") {
        results.push("✓ anaf_verified_at column already exists");
      } else {
        throw error;
      }
    }

    try {
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          ALTER TABLE companies
          ADD COLUMN IF NOT EXISTS vat_registered BOOLEAN;
        EXCEPTION
          WHEN duplicate_column THEN null;
        END $$;
      `);
      results.push("✓ Added vat_registered column");
    } catch (error: any) {
      if (error?.message?.includes("already exists") || error?.code === "42701") {
        results.push("✓ vat_registered column already exists");
      } else {
        throw error;
      }
    }

    try {
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          ALTER TABLE companies
          ADD COLUMN IF NOT EXISTS official_name TEXT;
        EXCEPTION
          WHEN duplicate_column THEN null;
        END $$;
      `);
      results.push("✓ Added official_name column");
    } catch (error: any) {
      if (error?.message?.includes("already exists") || error?.code === "42701") {
        results.push("✓ official_name column already exists");
      } else {
        throw error;
      }
    }

    // 7. Add field provenance columns
    try {
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          ALTER TABLE companies
          ADD COLUMN IF NOT EXISTS field_provenance JSONB;
        EXCEPTION
          WHEN duplicate_column THEN null;
        END $$;
      `);
      results.push("✓ Added field_provenance column");
    } catch (error: any) {
      if (error?.message?.includes("already exists") || error?.code === "42701") {
        results.push("✓ field_provenance column already exists");
      } else {
        throw error;
      }
    }

    try {
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          ALTER TABLE companies
          ADD COLUMN IF NOT EXISTS last_seen_at_from_sources TIMESTAMP(3);
        EXCEPTION
          WHEN duplicate_column THEN null;
        END $$;
      `);
      results.push("✓ Added last_seen_at_from_sources column");
    } catch (error: any) {
      if (error?.message?.includes("already exists") || error?.code === "42701") {
        results.push("✓ last_seen_at_from_sources column already exists");
      } else {
        throw error;
      }
    }

    // 8. Add universe and financial sync columns
    try {
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          ALTER TABLE companies
          ADD COLUMN IF NOT EXISTS founded_at TIMESTAMP(3);
        EXCEPTION
          WHEN duplicate_column THEN null;
        END $$;
      `);
      results.push("✓ Added founded_at column");
    } catch (error: any) {
      if (error?.message?.includes("already exists") || error?.code === "42701") {
        results.push("✓ founded_at column already exists");
      } else {
        throw error;
      }
    }

    try {
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          ALTER TABLE companies
          ADD COLUMN IF NOT EXISTS last_financial_sync_at TIMESTAMP(3);
        EXCEPTION
          WHEN duplicate_column THEN null;
        END $$;
      `);
      results.push("✓ Added last_financial_sync_at column");
    } catch (error: any) {
      if (error?.message?.includes("already exists") || error?.code === "42701") {
        results.push("✓ last_financial_sync_at column already exists");
      } else {
        throw error;
      }
    }

    try {
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          ALTER TABLE companies
          ADD COLUMN IF NOT EXISTS financial_source JSONB;
        EXCEPTION
          WHEN duplicate_column THEN null;
        END $$;
      `);
      results.push("✓ Added financial_source column");
    } catch (error: any) {
      if (error?.message?.includes("already exists") || error?.code === "42701") {
        results.push("✓ financial_source column already exists");
      } else {
        throw error;
      }
    }

    // 9. Add merge-related column
    try {
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          ALTER TABLE companies
          ADD COLUMN IF NOT EXISTS merged_into_company_id UUID;
        EXCEPTION
          WHEN duplicate_column THEN null;
        END $$;
      `);
      results.push("✓ Added merged_into_company_id column");
    } catch (error: any) {
      if (error?.message?.includes("already exists") || error?.code === "42701") {
        results.push("✓ merged_into_company_id column already exists");
      } else {
        throw error;
      }
    }

    // Add foreign key constraint if it doesn't exist
    try {
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'companies_merged_into_company_id_fkey'
            AND table_name = 'companies'
          ) THEN
            ALTER TABLE companies
            ADD CONSTRAINT companies_merged_into_company_id_fkey
            FOREIGN KEY (merged_into_company_id) REFERENCES companies(id) ON DELETE SET NULL;
          END IF;
        END $$;
      `);
      results.push("✓ Added foreign key constraint for merged_into_company_id");
    } catch (error: any) {
      results.push("⚠ Foreign key constraint may already exist or failed");
    }

    // 10. Verify the columns exist
    const columnCheck = await prisma.$queryRawUnsafe<Array<{
      column_name: string;
      data_type: string;
    }>>(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'companies' 
        AND column_name IN ('previous_romc_ai_score', 'romc_ai_score_delta', 'score_stability_profile', 'company_integrity_score', 'anaf_verified_at', 'vat_registered', 'official_name', 'field_provenance', 'last_seen_at_from_sources', 'founded_at', 'last_financial_sync_at', 'financial_source', 'merged_into_company_id')
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

