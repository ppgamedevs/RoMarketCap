/**
 * Add ingest_runs table and related enums
 */

import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return POST();
}

export async function POST() {
  try {
    const session = await requireAdminSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const results: string[] = [];

    // 1. Create DiscoverySource enum if it doesn't exist
    try {
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          CREATE TYPE "DiscoverySource" AS ENUM (
            'SEAP',
            'EU_FUNDS',
            'ANAF_VERIFY',
            'THIRD_PARTY'
          );
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);
      results.push("✓ Created DiscoverySource enum");
    } catch (error: any) {
      if (error?.message?.includes("already exists") || error?.code === "42P07") {
        results.push("✓ DiscoverySource enum already exists");
      } else {
        throw error;
      }
    }

    // 2. Create IngestRunStatus enum if it doesn't exist
    try {
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          CREATE TYPE "IngestRunStatus" AS ENUM (
            'STARTED',
            'COMPLETED',
            'FAILED',
            'PARTIAL'
          );
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);
      results.push("✓ Created IngestRunStatus enum");
    } catch (error: any) {
      if (error?.message?.includes("already exists") || error?.code === "42P07") {
        results.push("✓ IngestRunStatus enum already exists");
      } else {
        throw error;
      }
    }

    // 3. Create ingest_runs table if it doesn't exist
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "ingest_runs" (
          "id" TEXT NOT NULL,
          "source" "DiscoverySource" NOT NULL,
          "status" "IngestRunStatus" NOT NULL DEFAULT 'STARTED',
          "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "finished_at" TIMESTAMP(3),
          "cursor" TEXT,
          "stats_json" JSONB NOT NULL,
          "last_error" TEXT,

          CONSTRAINT "ingest_runs_pkey" PRIMARY KEY ("id")
        );
      `);
      results.push("✓ Created ingest_runs table");
    } catch (error: any) {
      if (error?.message?.includes("already exists") || error?.code === "42P01") {
        results.push("✓ ingest_runs table already exists");
      } else {
        throw error;
      }
    }

    // 4. Create indexes if they don't exist
    try {
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "ingest_runs_source_started_at_idx" ON "ingest_runs"("source", "started_at");
      `);
      results.push("✓ Created index on (source, started_at)");
    } catch (error: any) {
      results.push("⚠ Index on (source, started_at) may already exist");
    }

    try {
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "ingest_runs_status_idx" ON "ingest_runs"("status");
      `);
      results.push("✓ Created index on status");
    } catch (error: any) {
      results.push("⚠ Index on status may already exist");
    }

    try {
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "ingest_runs_started_at_idx" ON "ingest_runs"("started_at");
      `);
      results.push("✓ Created index on started_at");
    } catch (error: any) {
      results.push("⚠ Index on started_at may already exist");
    }

    // 5. Verify table exists
    const tableExists = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'ingest_runs'
      );
    `);

    if (tableExists[0]?.exists) {
      results.push("✓ Verified: ingest_runs table exists");
    } else {
      results.push("✗ Warning: ingest_runs table not found after creation");
    }

    return NextResponse.json({
      ok: true,
      message: "Ingest runs table migration completed",
      results,
    });
  } catch (error) {
    console.error("[admin/add-ingest-runs-table] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
