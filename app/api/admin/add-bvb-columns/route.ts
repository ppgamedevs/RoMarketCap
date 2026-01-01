/**
 * PROMPT 63: Add BVB Listed Company Columns
 * 
 * Migration endpoint to add stock exchange fields to companies table.
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
    // Allow browser access for convenience
    await requireAdminSession().catch(() => null);

    const results: string[] = [];

    // Add is_listed column
    try {
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          ALTER TABLE companies
          ADD COLUMN IF NOT EXISTS is_listed BOOLEAN DEFAULT false;
        EXCEPTION
          WHEN duplicate_column THEN null;
        END $$;
      `);
      results.push("✓ Added is_listed column");
    } catch (error: any) {
      if (error?.message?.includes("already exists") || error?.code === "42701") {
        results.push("✓ is_listed column already exists");
      } else {
        throw error;
      }
    }

    // Add stock_symbol column
    try {
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          ALTER TABLE companies
          ADD COLUMN IF NOT EXISTS stock_symbol VARCHAR(20);
        EXCEPTION
          WHEN duplicate_column THEN null;
        END $$;
      `);
      results.push("✓ Added stock_symbol column");
    } catch (error: any) {
      if (error?.message?.includes("already exists") || error?.code === "42701") {
        results.push("✓ stock_symbol column already exists");
      } else {
        throw error;
      }
    }

    // Add stock_exchange column
    try {
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          ALTER TABLE companies
          ADD COLUMN IF NOT EXISTS stock_exchange VARCHAR(20);
        EXCEPTION
          WHEN duplicate_column THEN null;
        END $$;
      `);
      results.push("✓ Added stock_exchange column");
    } catch (error: any) {
      if (error?.message?.includes("already exists") || error?.code === "42701") {
        results.push("✓ stock_exchange column already exists");
      } else {
        throw error;
      }
    }

    // Add market_cap column
    try {
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          ALTER TABLE companies
          ADD COLUMN IF NOT EXISTS market_cap DECIMAL(18, 2);
        EXCEPTION
          WHEN duplicate_column THEN null;
        END $$;
      `);
      results.push("✓ Added market_cap column");
    } catch (error: any) {
      if (error?.message?.includes("already exists") || error?.code === "42701") {
        results.push("✓ market_cap column already exists");
      } else {
        throw error;
      }
    }

    // Add last_price_at column
    try {
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          ALTER TABLE companies
          ADD COLUMN IF NOT EXISTS last_price_at TIMESTAMP;
        EXCEPTION
          WHEN duplicate_column THEN null;
        END $$;
      `);
      results.push("✓ Added last_price_at column");
    } catch (error: any) {
      if (error?.message?.includes("already exists") || error?.code === "42701") {
        results.push("✓ last_price_at column already exists");
      } else {
        throw error;
      }
    }

    // Add indexes
    try {
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS companies_is_listed_idx ON companies (is_listed);
      `);
      results.push("✓ Created is_listed index");
    } catch (error: any) {
      results.push(`Note: is_listed index: ${error?.message || "skipped"}`);
    }

    try {
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS companies_stock_symbol_idx ON companies (stock_symbol);
      `);
      results.push("✓ Created stock_symbol index");
    } catch (error: any) {
      results.push(`Note: stock_symbol index: ${error?.message || "skipped"}`);
    }

    try {
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS companies_market_cap_idx ON companies (market_cap);
      `);
      results.push("✓ Created market_cap index");
    } catch (error: any) {
      results.push(`Note: market_cap index: ${error?.message || "skipped"}`);
    }

    return NextResponse.json({
      ok: true,
      message: "BVB columns migration completed successfully",
      results,
    });
  } catch (error) {
    console.error("[admin/add-bvb-columns] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
