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
    results.push("=== Adding Missing Company Columns ===");

    const companyColumns = [
      { name: "data_confidence", type: "INTEGER", nullable: true },
      { name: "is_skeleton", type: "BOOLEAN", nullable: false, default: "false" },
    ];

    for (const col of companyColumns) {
      try {
        // Check if column already exists
        const checkResult = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'companies' AND column_name = $1;
        `, col.name);

        if (checkResult.length > 0) {
          results.push(`✓ Column ${col.name} already exists`);
          continue;
        }

        // Build ALTER TABLE statement
        let alterSql = `ALTER TABLE "companies" ADD COLUMN "${col.name}" ${col.type}`;
        
        if (col.nullable === false && col.default) {
          alterSql += ` DEFAULT ${col.default}`;
        }
        
        if (col.nullable === false) {
          alterSql += ` NOT NULL`;
        }

        await prisma.$executeRawUnsafe(alterSql);

        results.push(`✓ Added ${col.name} column`);
      } catch (err) {
        results.push(`✗ Error adding ${col.name}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Create indexes if needed
    results.push("\n=== Creating Indexes ===");
    try {
      // Check if data_confidence index exists
      const indexCheck = await prisma.$queryRawUnsafe<Array<{ indexname: string }>>(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'companies' 
        AND indexname LIKE '%data_confidence%';
      `);
      
      if (indexCheck.length === 0) {
        await prisma.$executeRawUnsafe(`
          CREATE INDEX IF NOT EXISTS "companies_data_confidence_idx" 
          ON "companies" ("data_confidence") 
          WHERE "data_confidence" IS NOT NULL;
        `);
        results.push("✓ Created index for data_confidence");
      } else {
        results.push("✓ Index for data_confidence already exists");
      }
    } catch (idxError) {
      results.push(`⚠ Could not create index: ${idxError instanceof Error ? idxError.message : String(idxError)}`);
    }

    // Verify columns exist
    results.push("\n=== Verification ===");
    const verifyResult = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'companies' 
      AND column_name IN ('data_confidence', 'is_skeleton')
      ORDER BY column_name;
    `);
    
    results.push(`✓ Found ${verifyResult.length} columns: ${verifyResult.map(r => r.column_name).join(", ")}`);

    return NextResponse.json({ ok: true, message: "Missing company columns added successfully", results });
  } catch (error) {
    console.error("[add-missing-company-columns] Error:", error);
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
      results,
    }, { status: 500 });
  }
}

