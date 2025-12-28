import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Diagnostic endpoint to check database schema
 * Helps verify what columns exist in the users table
 */
export async function GET(req: NextRequest) {
  try {
    const secret = req.nextUrl.searchParams.get("secret") || req.headers.get("x-migration-secret");
    const expectedSecret = process.env.MIGRATION_SECRET || "temp-migration-2024";
    
    if (secret !== expectedSecret) {
      return NextResponse.json({ 
        ok: false, 
        error: "Unauthorized. Add ?secret=temp-migration-2024 to the URL." 
      }, { status: 401 });
    }

    const results: Record<string, unknown> = {
      ok: true,
      checks: {},
    };

    // Check if users table exists
    try {
      const tableExists = await prisma.$queryRaw<Array<{ exists: boolean }>>`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'users'
        ) as exists;
      `;
      results.checks.usersTableExists = tableExists[0]?.exists ?? false;
    } catch (error: any) {
      results.checks.usersTableExists = false;
      results.checks.usersTableError = error.message;
    }

    // Check what columns exist in users table
    try {
      const columns = await prisma.$queryRaw<Array<{ column_name: string; data_type: string }>>`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
        ORDER BY ordinal_position;
      `;
      results.checks.columns = columns;
      results.checks.columnNames = columns.map(c => c.column_name);
      results.checks.hasPasswordColumn = columns.some(c => c.column_name === "password");
    } catch (error: any) {
      results.checks.columnsError = error.message;
    }

    // Try to query a user to see if password column works
    try {
      const testUser = await prisma.user.findFirst({
        select: {
          id: true,
          email: true,
          password: true,
        },
      });
      results.checks.canQueryPassword = true;
      results.checks.testUserHasPassword = testUser?.password !== null && testUser?.password !== undefined;
    } catch (error: any) {
      results.checks.canQueryPassword = false;
      results.checks.queryError = error.message;
      results.checks.queryErrorCode = error.code;
    }

    // Check Prisma schema expectations
    results.checks.expectedColumns = [
      "id",
      "name", 
      "email",
      "email_verified",
      "image",
      "password", // This is what we're checking for
      "role",
      "stripe_customer_id",
      "stripe_subscription_id",
      "subscription_status",
      "current_period_end",
      "is_premium",
      "premium_since",
      "premium_until",
      "export_credits",
      "referred_by_user_id",
      "referred_by_code",
      "referral_ltv",
      "created_at",
      "updated_at",
    ];

    return NextResponse.json(results);
  } catch (error) {
    console.error("[check-db] Error:", error);
    return NextResponse.json({ 
      ok: false, 
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}

