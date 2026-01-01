/**
 * Add employees column to company_financial_snapshots table
 * 
 * GET /api/admin/add-financial-snapshots-employees-column
 * 
 * This endpoint adds the employees column to the company_financial_snapshots table
 * if it doesn't already exist.
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

    const results: string[] = [];

    // Check if column already exists
    const columnExists = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'company_financial_snapshots' AND column_name = 'employees'
    `;

    if (columnExists.length > 0) {
      return NextResponse.json({
        ok: true,
        message: "Column already exists",
        results: ["✓ Column 'employees' already exists in company_financial_snapshots"],
      });
    }

    // Add employees column
    await prisma.$executeRaw`
      ALTER TABLE company_financial_snapshots
      ADD COLUMN IF NOT EXISTS employees INTEGER
    `;

    results.push("✓ Added employees column to company_financial_snapshots");

    // Verify column was added
    const verify = await prisma.$queryRaw<Array<{ column_name: string; data_type: string }>>`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'company_financial_snapshots' AND column_name = 'employees'
    `;

    if (verify.length > 0) {
      results.push(`✓ Verified: column exists (type: ${verify[0]!.data_type})`);
    } else {
      results.push("⚠ Warning: Column was not found after creation");
    }

    return NextResponse.json({
      ok: true,
      message: "Employees column added successfully",
      results,
    });
  } catch (error) {
    console.error("[admin/add-financial-snapshots-employees-column] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
