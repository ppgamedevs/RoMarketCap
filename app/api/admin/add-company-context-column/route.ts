/**
 * Admin endpoint to add company_context column to companies table
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { prisma } from "@/src/lib/db";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return POST(req);
}

export async function POST(req: NextRequest) {
  try {
    await requireAdminSession();

    const url = new URL(req.url);
    const secret = url.searchParams.get("secret");
    
    // Simple secret check (use environment variable in production)
    if (secret !== process.env.ADMIN_MIGRATION_SECRET && secret !== "add-company-context-2026") {
      return NextResponse.json({
        ok: false,
        error: "Unauthorized. Provide ?secret=add-company-context-2026",
      }, { status: 401 });
    }

    // Read migration SQL
    const migrationPath = path.join(process.cwd(), "prisma", "migrations", "add_company_context.sql");
    
    if (!fs.existsSync(migrationPath)) {
      return NextResponse.json({
        ok: false,
        error: "Migration file not found",
      }, { status: 404 });
    }

    const sql = fs.readFileSync(migrationPath, "utf-8");

    // Execute migration
    await prisma.$executeRawUnsafe(sql);

    // Verify column exists
    const columnCheck = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'companies' AND column_name = 'company_context'
    `);

    return NextResponse.json({
      ok: true,
      message: "Migration applied successfully",
      columnExists: columnCheck.length > 0,
    });

  } catch (error) {
    console.error("[add-company-context-column] Error:", error);
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
