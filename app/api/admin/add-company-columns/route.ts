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
    results.push("=== Adding Company Columns ===");

    const companyColumns = [
      { name: "canonical_slug", type: "TEXT", nullable: true, unique: true },
      { name: "is_demo", type: "BOOLEAN", nullable: false, default: "false" },
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

        // Add unique constraint if needed (only for nullable columns with unique constraint)
        if (col.unique && col.nullable) {
          try {
            // For nullable unique columns, create a partial unique index
            await prisma.$executeRawUnsafe(`
              CREATE UNIQUE INDEX IF NOT EXISTS "companies_${col.name}_key" 
              ON "companies" ("${col.name}") 
              WHERE "${col.name}" IS NOT NULL;
            `);
            results.push(`✓ Added unique index for ${col.name}`);
          } catch (idxError) {
            results.push(`⚠ Could not create unique index for ${col.name}: ${idxError instanceof Error ? idxError.message : String(idxError)}`);
          }
        } else if (col.unique && !col.nullable) {
          try {
            // For non-nullable unique columns, create a regular unique index
            await prisma.$executeRawUnsafe(`
              CREATE UNIQUE INDEX IF NOT EXISTS "companies_${col.name}_key" 
              ON "companies" ("${col.name}");
            `);
            results.push(`✓ Added unique index for ${col.name}`);
          } catch (idxError) {
            results.push(`⚠ Could not create unique index for ${col.name}: ${idxError instanceof Error ? idxError.message : String(idxError)}`);
          }
        }

        results.push(`✓ Added ${col.name} column`);
      } catch (err) {
        results.push(`✗ Error adding ${col.name}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Verify columns exist
    results.push("\n=== Verification ===");
    const verifyResult = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'companies' 
      AND column_name IN ('canonical_slug', 'is_demo')
      ORDER BY column_name;
    `);
    
    results.push(`✓ Found ${verifyResult.length} columns: ${verifyResult.map(r => r.column_name).join(", ")}`);

    return NextResponse.json({ ok: true, message: "Company columns added successfully", results });
  } catch (error) {
    console.error("[add-company-columns] Error:", error);
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
      results,
    }, { status: 500 });
  }
}

