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
    results.push("=== Adding Company Market Cap History ===");

    // Step 1: Add stock_price column to companies table
    try {
      const stockPriceCheck = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'companies' AND column_name = 'stock_price';
      `);

      if (stockPriceCheck.length > 0) {
        results.push("✓ Column stock_price already exists");
      } else {
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "companies" ADD COLUMN "stock_price" DECIMAL(10,4);
        `);
        results.push("✓ Added stock_price column to companies table");
      }
    } catch (err) {
      results.push(`✗ Error adding stock_price column: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Step 2: Add last_price_at column to companies table
    try {
      const lastPriceAtCheck = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'companies' AND column_name = 'last_price_at';
      `);

      if (lastPriceAtCheck.length > 0) {
        results.push("✓ Column last_price_at already exists");
      } else {
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "companies" ADD COLUMN "last_price_at" TIMESTAMP(3);
        `);
        results.push("✓ Added last_price_at column to companies table");
      }
    } catch (err) {
      results.push(`✗ Error adding last_price_at column: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Step 3: Check if company_market_cap_history table exists
    const tableCheck = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'company_market_cap_history'
      ) as exists;
    `);

    if (tableCheck[0]?.exists) {
      results.push("✓ Table company_market_cap_history already exists");
    } else {
      // Step 4: Create company_market_cap_history table
      try {
        await prisma.$executeRawUnsafe(`
          CREATE TABLE "company_market_cap_history" (
            "id" TEXT NOT NULL,
            "company_id" UUID NOT NULL,
            "recorded_at" TIMESTAMP(3) NOT NULL,
            "stock_price" DECIMAL(10,4) NOT NULL,
            "market_cap" DECIMAL(18,2) NOT NULL,
            "volume" BIGINT,
            "change_percent" DOUBLE PRECISION,
            "currency" TEXT NOT NULL DEFAULT 'RON',
            "source" TEXT NOT NULL DEFAULT 'bvb_sync',

            CONSTRAINT "company_market_cap_history_pkey" PRIMARY KEY ("id")
          );
        `);
        results.push("✓ Created company_market_cap_history table");
      } catch (err) {
        results.push(`✗ Error creating table: ${err instanceof Error ? err.message : String(err)}`);
        throw err;
      }

      // Step 5: Add foreign key constraint
      try {
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "company_market_cap_history" 
          ADD CONSTRAINT "company_market_cap_history_company_id_fkey" 
          FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        `);
        results.push("✓ Added foreign key constraint");
      } catch (err) {
        results.push(`⚠ Could not add foreign key (may already exist): ${err instanceof Error ? err.message : String(err)}`);
      }

      // Step 6: Create indexes
      try {
        await prisma.$executeRawUnsafe(`
          CREATE INDEX "company_market_cap_history_recorded_at_idx" 
          ON "company_market_cap_history"("recorded_at");
        `);
        results.push("✓ Created recorded_at index");
      } catch (err) {
        results.push(`⚠ Could not create recorded_at index (may already exist): ${err instanceof Error ? err.message : String(err)}`);
      }

      try {
        await prisma.$executeRawUnsafe(`
          CREATE INDEX "company_market_cap_history_company_id_recorded_at_idx" 
          ON "company_market_cap_history"("company_id", "recorded_at");
        `);
        results.push("✓ Created company_id_recorded_at index");
      } catch (err) {
        results.push(`⚠ Could not create company_id_recorded_at index (may already exist): ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Step 7: Verification
    results.push("\n=== Verification ===");
    
    const verifyColumns = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'companies' 
      AND column_name IN ('stock_price', 'last_price_at')
      ORDER BY column_name;
    `);
    results.push(`✓ Found ${verifyColumns.length} columns in companies table: ${verifyColumns.map(r => r.column_name).join(", ")}`);

    const verifyTable = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'company_market_cap_history'
      ) as exists;
    `);
    results.push(`✓ Table company_market_cap_history exists: ${verifyTable[0]?.exists ? "Yes" : "No"}`);

    if (verifyTable[0]?.exists) {
      const verifyIndexes = await prisma.$queryRawUnsafe<Array<{ indexname: string }>>(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'company_market_cap_history'
        ORDER BY indexname;
      `);
      results.push(`✓ Found ${verifyIndexes.length} indexes: ${verifyIndexes.map(r => r.indexname).join(", ")}`);
    }

    return NextResponse.json({ 
      ok: true, 
      message: "Company market cap history migration completed successfully", 
      results 
    });
  } catch (error) {
    console.error("[add-company-market-cap-history] Error:", error);
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
      results,
    }, { status: 500 });
  }
}
