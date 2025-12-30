/**
 * Create company_provenance table
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

    // 1. Create DiscoverySource enum if it doesn't exist
    try {
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          CREATE TYPE "DiscoverySource" AS ENUM (
            'SEAP',
            'EU_FUNDS',
            'MANUAL',
            'THIRD_PARTY'
          );
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);
      results.push("✓ Created DiscoverySource enum");
    } catch (error: any) {
      if (error?.message?.includes("already exists") || error?.code === "42P07") {
        results.push("✓ DiscoverySource enum already exists");
      } else {
        throw error;
      }
    }

    // 2. Create company_provenance table
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS company_provenance (
          id TEXT NOT NULL PRIMARY KEY,
          company_id UUID NOT NULL,
          source_name TEXT NOT NULL,
          external_id TEXT,
          imported_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          first_seen_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          last_seen_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          row_hash TEXT NOT NULL,
          raw_json JSONB,
          contract_value DECIMAL(18,2),
          contract_year INTEGER,
          contracting_authority TEXT,
          total_value DECIMAL(18,2),
          provider_id TEXT,
          run_id TEXT,
          last_payload_hash TEXT,
          discovery_source "DiscoverySource",
          evidence_url TEXT,
          confidence_score INTEGER,
          CONSTRAINT company_provenance_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
        );
      `);
      results.push("✓ Created company_provenance table");
    } catch (error: any) {
      if (error?.message?.includes("already exists") || error?.code === "42P01") {
        results.push("✓ company_provenance table already exists");
      } else {
        throw error;
      }
    }

    // 3. Create unique constraints
    try {
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          CREATE UNIQUE INDEX IF NOT EXISTS company_provenance_unique 
            ON company_provenance(company_id, source_name, row_hash);
        EXCEPTION
          WHEN duplicate_table THEN null;
        END $$;
      `);
      results.push("✓ Created company_provenance_unique index");
    } catch (error: any) {
      results.push("⚠ company_provenance_unique index may already exist");
    }

    try {
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          CREATE UNIQUE INDEX IF NOT EXISTS provenance_external_id_unique 
            ON company_provenance(source_name, external_id) 
            WHERE external_id IS NOT NULL;
        EXCEPTION
          WHEN duplicate_table THEN null;
        END $$;
      `);
      results.push("✓ Created provenance_external_id_unique index");
    } catch (error: any) {
      results.push("⚠ provenance_external_id_unique index may already exist");
    }

    // 4. Create other indexes
    const indexes = [
      { name: "company_provenance_company_id_idx", columns: "company_id" },
      { name: "company_provenance_source_name_idx", columns: "source_name" },
      { name: "company_provenance_source_name_external_id_idx", columns: "source_name, external_id" },
      { name: "company_provenance_contract_year_idx", columns: "contract_year" },
      { name: "company_provenance_provider_id_idx", columns: "provider_id" },
      { name: "company_provenance_run_id_idx", columns: "run_id" },
    ];

    for (const idx of indexes) {
      try {
        await prisma.$executeRawUnsafe(`
          CREATE INDEX IF NOT EXISTS ${idx.name} ON company_provenance(${idx.columns});
        `);
        results.push(`✓ Created ${idx.name}`);
      } catch (error: any) {
        results.push(`⚠ ${idx.name} may already exist`);
      }
    }

    // 5. Verify the table exists
    const tableCheck = await prisma.$queryRawUnsafe<Array<{
      table_name: string;
    }>>(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'company_provenance'
    `);

    if (tableCheck.length > 0) {
      results.push("✓ Verified: company_provenance table exists");
    } else {
      results.push("⚠ Warning: Table not found after creation");
    }

    return NextResponse.json({
      ok: true,
      message: "Company provenance table created successfully",
      results,
    });
  } catch (error) {
    console.error("[admin/add-company-provenance-table] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

