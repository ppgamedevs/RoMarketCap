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
    // Add premium_since column
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "premium_since" TIMESTAMP(3);
      `);
      results.push("Added premium_since column");
    } catch (err) {
      results.push(`Error adding premium_since: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Add premium_until column
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "premium_until" TIMESTAMP(3);
      `);
      results.push("Added premium_until column");
    } catch (err) {
      results.push(`Error adding premium_until: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Add referred_by_user_id column
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "referred_by_user_id" UUID;
      `);
      results.push("Added referred_by_user_id column");
    } catch (err) {
      results.push(`Error adding referred_by_user_id: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Add referred_by_code column
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "referred_by_code" TEXT;
      `);
      results.push("Added referred_by_code column");
    } catch (err) {
      results.push(`Error adding referred_by_code: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Add referral_ltv column
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "referral_ltv" DECIMAL(18,2);
      `);
      results.push("Added referral_ltv column");
    } catch (err) {
      results.push(`Error adding referral_ltv: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Verify which columns exist
    const columns = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = 'users'
      ORDER BY column_name;
    `;

    const columnNames = columns.map(c => c.column_name);

    return NextResponse.json({ 
      ok: true, 
      message: "Migration completed",
      results,
      existingColumns: columnNames,
      expectedColumns: [
        "id", "name", "email", "email_verified", "image", "password", "role",
        "stripe_customer_id", "stripe_subscription_id", "subscription_status",
        "current_period_end", "is_premium", "premium_since", "premium_until",
        "export_credits", "referred_by_user_id", "referred_by_code", "referral_ltv",
        "created_at", "updated_at"
      ]
    });
  } catch (error) {
    console.error("[add-all-user-columns] Error:", error);
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
      results,
    }, { status: 500 });
  }
}

