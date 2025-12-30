/**
 * Add universe-related columns to companies table
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

    // 1. Add universe_source column if it doesn't exist
    try {
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          ALTER TABLE companies
          ADD COLUMN IF NOT EXISTS universe_source TEXT;
        EXCEPTION
          WHEN duplicate_column THEN null;
        END $$;
      `);
      results.push("✓ Added universe_source column");
    } catch (error: any) {
      if (error?.message?.includes("already exists") || error?.code === "42701") {
        results.push("✓ universe_source column already exists");
      } else {
        throw error;
      }
    }

    // 2. Add universe_confidence column if it doesn't exist
    try {
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          ALTER TABLE companies
          ADD COLUMN IF NOT EXISTS universe_confidence INTEGER;
        EXCEPTION
          WHEN duplicate_column THEN null;
        END $$;
      `);
      results.push("✓ Added universe_confidence column");
    } catch (error: any) {
      if (error?.message?.includes("already exists") || error?.code === "42701") {
        results.push("✓ universe_confidence column already exists");
      } else {
        throw error;
      }
    }

    // 3. Add universe_verified column if it doesn't exist
    try {
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          ALTER TABLE companies
          ADD COLUMN IF NOT EXISTS universe_verified BOOLEAN NOT NULL DEFAULT false;
        EXCEPTION
          WHEN duplicate_column THEN null;
        END $$;
      `);
      results.push("✓ Added universe_verified column");
    } catch (error: any) {
      if (error?.message?.includes("already exists") || error?.code === "42701") {
        results.push("✓ universe_verified column already exists");
      } else {
        throw error;
      }
    }

    // 4. Verify the columns exist
    const columnCheck = await prisma.$queryRawUnsafe<Array<{
      column_name: string;
      data_type: string;
    }>>(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'companies' 
        AND column_name IN ('universe_source', 'universe_confidence', 'universe_verified')
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
      message: "Universe columns added successfully",
      results,
    });
  } catch (error) {
    console.error("[admin/add-universe-columns] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

