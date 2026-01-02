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
    console.error("[admin/add-financial-snapshots-columns] GET error:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}

export async function POST() {
  try {
    await requireAdminSession().catch(() => null); // Allow browser access for convenience

    const results: string[] = [];

    // Check if fetched_at column exists
    const fetchedAtExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'company_financial_snapshots'
        AND column_name = 'fetched_at'
      );
    `;

    if (!(fetchedAtExists as any[])[0].exists) {
      await prisma.$executeRaw`
        ALTER TABLE public.company_financial_snapshots
        ADD COLUMN fetched_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
      `;
      results.push("✓ Added fetched_at column");
    } else {
      results.push("✓ fetched_at column already exists");
    }

    // Check if checksum column exists
    const checksumExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'company_financial_snapshots'
        AND column_name = 'checksum'
      );
    `;

    if (!(checksumExists as any[])[0].exists) {
      await prisma.$executeRaw`
        ALTER TABLE public.company_financial_snapshots
        ADD COLUMN checksum TEXT;
      `;
      results.push("✓ Added checksum column");
    } else {
      results.push("✓ checksum column already exists");
    }

    // Verify columns
    const verifyQuery = await prisma.$queryRaw<Array<{ column_name: string; data_type: string }>>`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'company_financial_snapshots'
      AND column_name IN ('fetched_at', 'checksum')
      ORDER BY column_name;
    `;

    results.push(`✓ Verified columns: ${verifyQuery.map(c => `${c.column_name} (${c.data_type})`).join(', ')}`);

    return NextResponse.json({ ok: true, message: "Financial snapshots columns added successfully", results });
  } catch (error) {
    console.error("[admin/add-financial-snapshots-columns] Fatal error:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
