import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Check if all auth-related tables exist and have correct structure
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

    const results: {
      ok: boolean;
      tables: Record<string, {
        exists: boolean;
        columns?: string[];
        error?: string;
      }>;
      foreignKeys?: Array<{
        table_name: string;
        constraint_name: string;
        column_name: string;
      }>;
      foreignKeysError?: string;
    } = {
      ok: true,
      tables: {},
    };

    // Check each auth table
    const authTables = ["users", "accounts", "sessions", "verification_tokens"];
    
    for (const tableName of authTables) {
      try {
        // Check if table exists
        const tableExists = await prisma.$queryRaw<Array<{ exists: boolean }>>`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = ${tableName}
          ) as exists;
        `;
        
        const exists = tableExists[0]?.exists ?? false;
        results.tables[tableName] = { exists };
        
        if (exists) {
          // Get columns
          const columns = await prisma.$queryRaw<Array<{ column_name: string }>>`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = ${tableName}
            ORDER BY ordinal_position;
          `;
          results.tables[tableName].columns = columns.map(c => c.column_name);
        }
      } catch (error: any) {
        results.tables[tableName] = {
          exists: false,
          error: error.message,
        };
      }
    }

    // Check foreign keys
    try {
      const foreignKeys = await prisma.$queryRaw<Array<{
        table_name: string;
        constraint_name: string;
        column_name: string;
      }>>`
        SELECT 
          tc.table_name,
          tc.constraint_name,
          kcu.column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
          AND (tc.table_name = 'accounts' OR tc.table_name = 'sessions')
        ORDER BY tc.table_name, tc.constraint_name;
      `;
      results.foreignKeys = foreignKeys;
    } catch (error: any) {
      results.foreignKeysError = error.message;
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("[check-auth-tables] Error:", error);
    return NextResponse.json({ 
      ok: false, 
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

