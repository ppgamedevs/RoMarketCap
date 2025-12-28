import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Add export_credits column to users table if it doesn't exist
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

    // Check if column exists
    const checkResult = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'export_credits'
    `;

    if (checkResult.length > 0) {
      return NextResponse.json({ 
        ok: true, 
        message: "Column export_credits already exists",
        alreadyExists: true 
      });
    }

    // Add the column
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "users" 
      ADD COLUMN IF NOT EXISTS "export_credits" INTEGER NOT NULL DEFAULT 0;
    `);

    return NextResponse.json({ 
      ok: true, 
      message: "Column export_credits added successfully",
      alreadyExists: false 
    });
  } catch (error) {
    console.error("[add-export-credits-column] Error:", error);
    return NextResponse.json({ 
      ok: false, 
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}

