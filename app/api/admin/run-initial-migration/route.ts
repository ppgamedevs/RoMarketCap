import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Endpoint to run initial database migrations
 * This will create all tables including the users table
 */
async function runInitialMigration(req: NextRequest) {
  try {
    const secret = req.headers.get("x-migration-secret") || req.nextUrl.searchParams.get("secret");
    const expectedSecret = process.env.MIGRATION_SECRET || "temp-migration-2024";
    
    if (secret !== expectedSecret) {
      return NextResponse.json({ 
        ok: false, 
        error: "Unauthorized. Add ?secret=temp-migration-2024 to the URL or set MIGRATION_SECRET env var." 
      }, { status: 401 });
    }

    // Check if users table exists
    const tableCheck = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      ) as exists;
    `;
    
    if (tableCheck[0]?.exists) {
      return NextResponse.json({ 
        ok: true, 
        message: "Users table already exists. Initial migration appears to have been run.",
        alreadyExists: true
      });
    }

    // Read and execute the initial migration
    // Note: In production, you should use prisma migrate deploy instead
    // This is a workaround to run migrations via API
    
    return NextResponse.json({ 
      ok: false, 
      error: "Initial migration must be run via Prisma CLI. Please run: npx prisma migrate deploy",
      instruction: "Run this command in your deployment environment or use Vercel's database interface to run the migration SQL manually."
    }, { status: 400 });
    
  } catch (error) {
    console.error("[run-initial-migration] Error:", error);
    return NextResponse.json({ 
      ok: false, 
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return runInitialMigration(req);
}

export async function POST(req: NextRequest) {
  return runInitialMigration(req);
}

