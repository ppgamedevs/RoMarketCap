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

  try {
    // Check if verification_tokens table exists
    const tableCheck = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'verification_tokens'
      ) as exists;
    `;

    const tableExists = tableCheck[0]?.exists ?? false;

    if (!tableExists) {
      return NextResponse.json({
        ok: false,
        error: "verification_tokens table does not exist",
        tableExists: false,
        suggestion: "Run the initial migration to create the table"
      }, { status: 404 });
    }

    // Get table structure
    const columns = await prisma.$queryRaw<Array<{
      column_name: string;
      data_type: string;
      is_nullable: string;
    }>>`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = 'verification_tokens'
      ORDER BY ordinal_position;
    `;

    // Check for indexes
    const indexes = await prisma.$queryRaw<Array<{
      indexname: string;
      indexdef: string;
    }>>`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public' 
      AND tablename = 'verification_tokens';
    `;

    // Try a simple query
    let canQuery = false;
    let queryError: string | null = null;
    try {
      await prisma.verificationToken.findFirst({ take: 1 });
      canQuery = true;
    } catch (err) {
      queryError = err instanceof Error ? err.message : String(err);
    }

    return NextResponse.json({
      ok: true,
      tableExists: true,
      columns: columns.map(c => ({
        name: c.column_name,
        type: c.data_type,
        nullable: c.is_nullable === "YES"
      })),
      indexes: indexes.map(i => ({
        name: i.indexname,
        definition: i.indexdef
      })),
      canQuery,
      queryError,
      expectedColumns: ["identifier", "token", "expires"],
      expectedIndexes: ["verification_tokens_token_key"] // Unique index on token
    });
  } catch (error) {
    console.error("[check-verification-table] Error:", error);
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

