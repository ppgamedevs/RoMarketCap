import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret") || req.headers.get("x-migration-secret");
  const expectedSecret = process.env.MIGRATION_SECRET || "temp-migration-2024";

  if (secret !== expectedSecret) {
    return NextResponse.json({
      ok: false,
      error: "Unauthorized. Add ?secret=temp-migration-2024 to the URL."
    }, { status: 401 });
  }

  const results: string[] = [];

  try {
    results.push("=== Adding GDPR Compliance Columns ===");

    // Add cookie_policy_accepted_at
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "cookie_policy_accepted_at" TIMESTAMP(3);
    `);
    results.push("✓ Added cookie_policy_accepted_at column");

    // Add terms_accepted_at
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "terms_accepted_at" TIMESTAMP(3);
    `);
    results.push("✓ Added terms_accepted_at column");

    // Add cookie_policy_version
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "cookie_policy_version" TEXT;
    `);
    results.push("✓ Added cookie_policy_version column");

    // Add terms_version
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "terms_version" TEXT;
    `);
    results.push("✓ Added terms_version column");

    results.push("\n=== Verification ===");
    const userColumns = await prisma.$queryRaw<
      { column_name: string; data_type: string }[]
    >`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name IN ('cookie_policy_accepted_at', 'terms_accepted_at', 'cookie_policy_version', 'terms_version');
    `;
    results.push(`✓ Found ${userColumns.length} GDPR columns: ${userColumns.map(c => c.column_name).join(', ')}`);

    return NextResponse.json({ ok: true, message: "GDPR columns added successfully", results });
  } catch (error) {
    console.error("[add-gdpr-columns] Error:", error);
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

