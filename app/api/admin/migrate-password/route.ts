import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Endpoint to run the password column migration
 * This is a temporary endpoint to add the password column to the users table
 * Protected by a simple secret token to prevent unauthorized access
 */
async function runMigration(req: NextRequest) {
  try {
    // Simple secret protection (you can set MIGRATION_SECRET in env vars)
    // For now, we'll allow it without auth since you can't log in anyway
    const secret = req.headers.get("x-migration-secret") || req.nextUrl.searchParams.get("secret");
    const expectedSecret = process.env.MIGRATION_SECRET || "temp-migration-2024";
    
    if (secret !== expectedSecret) {
      return NextResponse.json({ 
        ok: false, 
        error: "Unauthorized. Add ?secret=temp-migration-2024 to the URL or set MIGRATION_SECRET env var." 
      }, { status: 401 });
    }

    // First, check if users table exists
    const tableCheck = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      ) as exists;
    `;
    
    if (!tableCheck[0]?.exists) {
      return NextResponse.json({ 
        ok: false, 
        error: "Users table does not exist. Please run initial migrations first.",
        tableExists: false
      }, { status: 400 });
    }

    // Check if column already exists
    const columnCheck = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'password'
      ) as exists;
    `;

    if (columnCheck[0]?.exists) {
      return NextResponse.json({ 
        ok: true, 
        message: "Password column already exists",
        alreadyExists: true 
      });
    }

    // Column doesn't exist, add it
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "users" 
      ADD COLUMN IF NOT EXISTS "password" TEXT;
    `);
    
    return NextResponse.json({ 
      ok: true, 
      message: "Password column added successfully",
      alreadyExists: false 
    });
  } catch (error) {
    console.error("[migrate-password] Error:", error);
    return NextResponse.json({ 
      ok: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return runMigration(req);
}

export async function POST(req: NextRequest) {
  return runMigration(req);
}

