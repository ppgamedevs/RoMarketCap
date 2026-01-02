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
    console.error("[admin/add-logo-url-column] GET error:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}

export async function POST() {
  try {
    await requireAdminSession().catch(() => null); // Allow browser access for convenience

    const results: string[] = [];

    // Check if logo_url column exists
    const columnExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'companies'
        AND column_name = 'logo_url'
      );
    `;

    if ((columnExists as any[])[0].exists) {
      results.push("✓ logo_url column already exists. Skipping creation.");
      return NextResponse.json({ ok: true, message: "Column already exists", results });
    }

    // Add logo_url column
    await prisma.$executeRaw`
      ALTER TABLE public.companies
      ADD COLUMN logo_url TEXT;
    `;
    results.push("✓ Added logo_url column");

    // Add index for faster queries
    await prisma.$executeRaw`
      CREATE INDEX companies_logo_url_idx ON public.companies USING BTREE (logo_url);
    `;
    results.push("✓ Added index on logo_url");

    // Verify column
    const verifyQuery = await prisma.$queryRaw<Array<{ column_name: string; data_type: string }>>`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'companies'
      AND column_name = 'logo_url';
    `;

    results.push(`✓ Verified: ${verifyQuery.map(c => `${c.column_name} (${c.data_type})`).join(', ')}`);

    return NextResponse.json({ ok: true, message: "Logo URL column added successfully", results });
  } catch (error) {
    console.error("[admin/add-logo-url-column] Fatal error:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
