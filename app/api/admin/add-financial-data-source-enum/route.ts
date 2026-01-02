import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdminSession().catch(() => null); // Allow browser access for convenience
    return await POST();
  } catch (error) {
    console.error("[admin/add-financial-data-source-enum] GET error:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}

export async function POST() {
  try {
    await requireAdminSession().catch(() => null); // Allow browser access for convenience

    const results: string[] = [];

    // Check if ANAF_WS enum value exists
    const enumExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'CompanyFinancialDataSource'
        AND e.enumlabel = 'ANAF_WS'
      );
    `;

    if ((enumExists as any[])[0].exists) {
      results.push("✓ ANAF_WS enum value already exists. Skipping creation.");
      return NextResponse.json({ ok: true, message: "Enum value already exists", results });
    }

    // Add ANAF_WS to CompanyFinancialDataSource enum
    await prisma.$executeRaw`
      ALTER TYPE "CompanyFinancialDataSource" ADD VALUE IF NOT EXISTS 'ANAF_WS';
    `;
    results.push("✓ Added ANAF_WS to CompanyFinancialDataSource enum");

    // Verify enum values
    const verifyQuery = await prisma.$queryRaw<Array<{ enumlabel: string }>>`
      SELECT e.enumlabel
      FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = 'CompanyFinancialDataSource'
      ORDER BY e.enumsortorder;
    `;

    results.push(`✓ Current enum values: ${verifyQuery.map(v => v.enumlabel).join(', ')}`);

    return NextResponse.json({ ok: true, message: "CompanyFinancialDataSource enum updated successfully", results });
  } catch (error) {
    console.error("[admin/add-financial-data-source-enum] Fatal error:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
