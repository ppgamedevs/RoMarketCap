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
    results.push("=== Creating ImportJobStatus Enum ===");

    // Check if enum exists
    const enumCheck = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(`
      SELECT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'ImportJobStatus'
      ) as exists;
    `);

    if (!enumCheck[0]?.exists) {
      await prisma.$executeRawUnsafe(`
        CREATE TYPE "ImportJobStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED');
      `);
      results.push("✓ Created ImportJobStatus enum");
    } else {
      results.push("✓ ImportJobStatus enum already exists");
    }

    results.push("\n=== Creating import_jobs Table ===");

    // Check if table exists
    const tableCheck = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'import_jobs'
      ) as exists;
    `);

    if (!tableCheck[0]?.exists) {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE "import_jobs" (
          "id" TEXT NOT NULL,
          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "status" "ImportJobStatus" NOT NULL DEFAULT 'PENDING',
          "source_name" TEXT NOT NULL,
          "total_rows" INTEGER NOT NULL DEFAULT 0,
          "processed_rows" INTEGER NOT NULL DEFAULT 0,
          "error_rows" INTEGER NOT NULL DEFAULT 0,
          "started_at" TIMESTAMP(3),
          "finished_at" TIMESTAMP(3),
          "notes" TEXT,

          CONSTRAINT "import_jobs_pkey" PRIMARY KEY ("id")
        );
      `);
      results.push("✓ Created import_jobs table");

      // Create indexes
      await prisma.$executeRawUnsafe(`
        CREATE INDEX "import_jobs_status_idx" ON "import_jobs"("status");
      `);
      results.push("✓ Created index on status");

      await prisma.$executeRawUnsafe(`
        CREATE INDEX "import_jobs_created_at_idx" ON "import_jobs"("created_at");
      `);
      results.push("✓ Created index on created_at");

      await prisma.$executeRawUnsafe(`
        CREATE INDEX "import_jobs_source_name_idx" ON "import_jobs"("source_name");
      `);
      results.push("✓ Created index on source_name");
    } else {
      results.push("✓ import_jobs table already exists");
    }

    results.push("\n=== Creating import_row_errors Table ===");

    // Check if table exists
    const errorsTableCheck = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'import_row_errors'
      ) as exists;
    `);

    if (!errorsTableCheck[0]?.exists) {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE "import_row_errors" (
          "id" TEXT NOT NULL,
          "job_id" TEXT NOT NULL,
          "row_number" INTEGER NOT NULL,
          "reason" TEXT NOT NULL,
          "raw_row_json" JSONB NOT NULL,

          CONSTRAINT "import_row_errors_pkey" PRIMARY KEY ("id")
        );
      `);
      results.push("✓ Created import_row_errors table");

      // Create foreign key
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "import_row_errors" 
        ADD CONSTRAINT "import_row_errors_job_id_fkey" 
        FOREIGN KEY ("job_id") REFERENCES "import_jobs"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
      `);
      results.push("✓ Created foreign key constraint");

      // Create index
      await prisma.$executeRawUnsafe(`
        CREATE INDEX "import_row_errors_job_id_idx" ON "import_row_errors"("job_id");
      `);
      results.push("✓ Created index on job_id");
    } else {
      results.push("✓ import_row_errors table already exists");
    }

    results.push("\n=== Verification ===");
    const verifyResult = await prisma.$queryRawUnsafe<Array<{ table_name: string }>>(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('import_jobs', 'import_row_errors')
      ORDER BY table_name;
    `);

    results.push(`✓ Found ${verifyResult.length} tables: ${verifyResult.map(r => r.table_name).join(", ")}`);

    return NextResponse.json({ ok: true, message: "Import jobs tables created successfully", results });
  } catch (error) {
    console.error("[add-import-jobs-tables] Error:", error);
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
      results,
    }, { status: 500 });
  }
}

