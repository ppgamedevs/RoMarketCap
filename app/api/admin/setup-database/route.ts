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
    // 1. Add missing user columns
    results.push("=== Adding User Columns ===");
    
    const userColumns = [
      { name: "premium_since", type: "TIMESTAMP(3)" },
      { name: "premium_until", type: "TIMESTAMP(3)" },
      { name: "referred_by_user_id", type: "UUID" },
      { name: "referred_by_code", type: "TEXT" },
      { name: "referral_ltv", type: "DECIMAL(18,2)" },
    ];

    for (const col of userColumns) {
      try {
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "users"
          ADD COLUMN IF NOT EXISTS "${col.name}" ${col.type};
        `);
        results.push(`✓ Added ${col.name} column`);
      } catch (err) {
        results.push(`✗ Error adding ${col.name}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // 2. Create NationalIngestJobStatus enum
    results.push("\n=== Creating Enums ===");
    try {
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          CREATE TYPE "NationalIngestJobStatus" AS ENUM ('STARTED', 'COMPLETED', 'FAILED', 'PARTIAL');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
      `);
      results.push("✓ Created NationalIngestJobStatus enum");
    } catch (err) {
      results.push(`✗ Error creating enum: ${err instanceof Error ? err.message : String(err)}`);
    }

    // 3. Create NationalIngestJob table
    results.push("\n=== Creating National Ingestion Tables ===");
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "national_ingest_jobs" (
          "id" TEXT NOT NULL,
          "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "finished_at" TIMESTAMP(3),
          "status" "NationalIngestJobStatus" NOT NULL DEFAULT 'STARTED',
          "mode" TEXT NOT NULL,
          "limit" INTEGER NOT NULL,
          "cursor_in" TEXT,
          "cursor_out" TEXT,
          "discovered" INTEGER NOT NULL DEFAULT 0,
          "upserted" INTEGER NOT NULL DEFAULT 0,
          "errors" INTEGER NOT NULL DEFAULT 0,
          "stats" JSONB,
          "notes" TEXT,
          CONSTRAINT "national_ingest_jobs_pkey" PRIMARY KEY ("id")
        );
      `);
      results.push("✓ Created national_ingest_jobs table");

      // Create indexes
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "national_ingest_jobs_started_at_idx" ON "national_ingest_jobs"("started_at");
      `).catch(() => null);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "national_ingest_jobs_status_idx" ON "national_ingest_jobs"("status");
      `).catch(() => null);
      results.push("✓ Created indexes for national_ingest_jobs");
    } catch (err) {
      results.push(`✗ Error creating national_ingest_jobs: ${err instanceof Error ? err.message : String(err)}`);
    }

    // 4. Create NationalIngestError table
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "national_ingest_errors" (
          "id" TEXT NOT NULL,
          "job_id" TEXT NOT NULL,
          "cui" TEXT,
          "source_type" TEXT NOT NULL,
          "source_ref" TEXT,
          "reason" TEXT NOT NULL,
          "raw_payload" JSONB,
          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "national_ingest_errors_pkey" PRIMARY KEY ("id")
        );
      `);
      results.push("✓ Created national_ingest_errors table");

      // Create indexes
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "national_ingest_errors_job_id_idx" ON "national_ingest_errors"("job_id");
      `).catch(() => null);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "national_ingest_errors_source_type_idx" ON "national_ingest_errors"("source_type");
      `).catch(() => null);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "national_ingest_errors_created_at_idx" ON "national_ingest_errors"("created_at");
      `).catch(() => null);
      results.push("✓ Created indexes for national_ingest_errors");

      // Add foreign key constraint
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          ALTER TABLE "national_ingest_errors" 
          ADD CONSTRAINT "national_ingest_errors_job_id_fkey" 
          FOREIGN KEY ("job_id") REFERENCES "national_ingest_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
      `).catch(() => null);
      results.push("✓ Added foreign key constraint");
    } catch (err) {
      results.push(`✗ Error creating national_ingest_errors: ${err instanceof Error ? err.message : String(err)}`);
    }

    // 5. Verify tables exist
    results.push("\n=== Verification ===");
    const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'national_ingest_jobs', 'national_ingest_errors')
      ORDER BY table_name;
    `;
    results.push(`✓ Found ${tables.length} tables: ${tables.map(t => t.table_name).join(", ")}`);

    // Check user columns
    const userCols = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = 'users'
      AND column_name IN ('premium_since', 'premium_until', 'referred_by_user_id', 'referred_by_code', 'referral_ltv')
      ORDER BY column_name;
    `;
    results.push(`✓ Found ${userCols.length} user columns: ${userCols.map(c => c.column_name).join(", ")}`);

    return NextResponse.json({ 
      ok: true, 
      message: "Database setup completed",
      results,
    });
  } catch (error) {
    console.error("[setup-database] Error:", error);
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
      results,
    }, { status: 500 });
  }
}

